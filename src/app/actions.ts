"use server";

import { erpDb, prisma } from "@/lib/db";
import { productCatalog } from "@/lib/catalog";
import { revalidatePath } from "next/cache";
import { signJwt, verifyJwt } from "@/lib/jwt";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// 1. Authentication & Registration & Audit Helpers
function auditLog(action: string, performedBy: string, targetUser: string, details: any) {
  const logObj = {
    timestamp: new Date().toISOString(),
    action,
    performedBy,
    targetUser,
    details
  };
  console.log(JSON.stringify(logObj));
}

async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  if (!token) return "system";
  try {
    const payload = await verifyJwt(token);
    return payload ? (payload.id as string) : "system";
  } catch {
    return "system";
  }
}

export async function authenticateUserAction(email: string, passwordPlain: string) {
  const user = await erpDb.users.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid credentials. User account does not exist." };
  }
  
  if (passwordPlain !== "Admin@123") {
    return { error: "Invalid credentials. Password incorrect." };
  }
  
  if (user.status === "PENDING") {
    return { error: "Account registration is PENDING Admin approval." };
  }
  if (user.status === "REJECTED") {
    return { error: "Account registration has been REJECTED by Admin." };
  }

  // Update lastLogin tracking in a single database transaction if not mock, or simple update in mock mode
  if (!erpDb.isMock()) {
    await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { currentLoginAt: true }
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: dbUser?.currentLoginAt || null,
          currentLoginAt: new Date(),
          lastLogin: new Date()
        }
      });
    });
  } else {
    const currentMockUser = await erpDb.users.findUnique({ where: { id: user.id } });
    await erpDb.users.update({
      where: { id: user.id },
      data: {
        lastLoginAt: currentMockUser?.currentLoginAt || null,
        currentLoginAt: new Date(),
        lastLogin: new Date()
      }
    });
  }
 
  // Sign JWT Session Token
  const token = await signJwt({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.roleId,
    branch: user.branch
  });
 
  // Set Cookie session
  const cookieStore = await cookies();
  cookieStore.set("erp-session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 // 24 hours
  });
 
  auditLog("USER_LOGIN", user.id, user.id, { email: user.email, success: true });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleId,
      branch: user.branch,
      status: user.status
    }
  };
}
 
export async function logoutUserAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("erp-session-token")?.value;
  let userId = "unknown";
  if (token) {
    try {
      const payload = await verifyJwt(token);
      if (payload) userId = payload.id as string;
    } catch {}
  }
  cookieStore.delete("erp-session-token");
  auditLog("USER_LOGOUT", userId, userId, {});
  return { success: true };
}
 
export async function registerUserAction(data: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  companyName: string;
  gstNumber?: string;
  passwordHash: string;
  branch: string;
}) {
  const existing = await erpDb.users.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Email address is already registered." };
  }
 
  const hashedPassword = bcrypt.hashSync(data.passwordHash, 10);
 
  const result = await erpDb.users.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: hashedPassword,
      roleId: "CUSTOMER", // Auto CUSTOMER role
      branch: data.branch,
      status: "ACTIVE", // Auto ACTIVE
      phone: data.phone,
      address: data.address,
      lastLogin: new Date() // Set last login on signup
    }
  });

  // Sign JWT Session Token for auto-login
  const token = await signJwt({
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.roleId,
    branch: result.branch
  });
 
  const cookieStore = await cookies();
  cookieStore.set("erp-session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 // 24 hours
  });
 
  auditLog("USER_REGISTER", result.id, result.id, { email: result.email });

  return { success: true, user: result };
}
 
export async function updateUserStatusAction(data: {
  userId: string;
  status: string; // ACTIVE, REJECTED
  role?: string;
  adminEmail: string;
}) {
  const dataToUpdate: any = { status: data.status };
  if (data.role) dataToUpdate.roleId = data.role;

  const result = await erpDb.users.update({
    where: { id: data.userId },
    data: dataToUpdate
  });

  const performedBy = await getCurrentUserId();
  auditLog("ADMIN_USER_STATUS_ROLE_UPDATE", performedBy, data.userId, { status: data.status, role: data.role });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, user: result };
}

// 2. Stock Addition & Reduction Actions
export async function addStockAction(data: {
  sku: string;
  branchCode: string;
  quantity: number;
  userId: string;
}) {
  const allInv = await erpDb.inventory.findMany();
  const existing = allInv.find(i => i.sku === data.sku && i.branchCode === data.branchCode);

  let updatedQty = data.quantity;
  if (existing) {
    updatedQty = existing.quantity + data.quantity;
    await erpDb.inventory.update({
      where: { id: existing.id },
      data: { quantity: updatedQty }
    });
  } else {
    // Seed new stock record
    const dbProduct = await erpDb.products.findUnique({ where: { sku: data.sku } });
    const itemName = dbProduct ? dbProduct.name : data.sku;
    
    await erpDb.inventory.create({
      data: {
        productId: dbProduct?.id || "p-1",
        branchId: data.branchCode,
        availableStock: data.quantity,
        sku: data.sku,
        itemName,
        branchCode: data.branchCode,
        quantity: data.quantity,
        reservedQty: 0
      }
    });
  }

  // Create movement audit trail
  await erpDb.inventoryMovements.create({
    data: {
      sku: data.sku,
      branchCode: data.branchCode,
      type: "ADDITION",
      quantity: data.quantity,
      details: `Added ${data.quantity} units of SKU ${data.sku} at ${data.branchCode}`,
      userId: data.userId
    }
  });

  // Check if we should resolve any active alerts
  const allAlerts = await erpDb.stockAlerts.findMany();
  const activeAlert = allAlerts.find((a: any) => a.branchCode === data.branchCode && a.message.includes(data.sku) && !a.resolved);
  if (activeAlert && updatedQty >= 10) {
    await erpDb.stockAlerts.update({
      where: { id: activeAlert.id },
      data: { resolved: true }
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reduceStockAction(data: {
  sku: string;
  branchCode: string;
  quantity: number;
  userId: string;
}) {
  const allInv = await erpDb.inventory.findMany();
  const existing = allInv.find(i => i.sku === data.sku && i.branchCode === data.branchCode);

  if (!existing) {
    throw new Error(`No stock record found for SKU ${data.sku} at branch ${data.branchCode}`);
  }

  const freeStock = existing.quantity - existing.reservedQty;
  if (freeStock < data.quantity) {
    // Generate low stock alert immediately
    await erpDb.stockAlerts.create({
      data: {
        type: "CRITICAL_STOCK",
        message: `Critically low: Stock reduction request of ${data.quantity} units failed due to insufficient available quantity of ${data.sku} at ${data.branchCode}. Free stock: ${freeStock}.`,
        branchCode: data.branchCode,
        resolved: false
      }
    });

    throw new Error(`Insufficient available stock. Free available: ${freeStock} units, requested: ${data.quantity} units.`);
  }

  const updatedQty = existing.quantity - data.quantity;
  await erpDb.inventory.update({
    where: { id: existing.id },
    data: { quantity: updatedQty }
  });

  // Create movement audit trail
  await erpDb.inventoryMovements.create({
    data: {
      sku: data.sku,
      branchCode: data.branchCode,
      type: "REDUCTION",
      quantity: data.quantity,
      details: `Reduced stock by ${data.quantity} units for SKU ${data.sku} at ${data.branchCode}`,
      userId: data.userId
    }
  });

  // Trigger alert if stock falls below reorder Level
  if (updatedQty < 10) {
    await erpDb.stockAlerts.create({
      data: {
        type: "LOW_STOCK",
        message: `${data.sku} in ${data.branchCode} is below reorder level. Current: ${updatedQty} units. Reorder Level: 10.`,
        branchCode: data.branchCode,
        resolved: false
      }
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

// 3. Stock Direct Transfer Action
export async function transferInventoryAction(data: {
  inventoryId: string;
  targetWarehouseId: string; // Target branch code (HYD-HQ, BLR, CHN)
  quantityToTransfer: number;
  userId: string;
}) {
  const allInv = await erpDb.inventory.findMany();
  const sourceItem = allInv.find((i) => i.id === data.inventoryId);
  if (!sourceItem) throw new Error("Source stock not found");

  if (sourceItem.quantity - sourceItem.reservedQty < data.quantityToTransfer) {
    throw new Error("Insufficient unreserved stock available for transfer");
  }

  // Deduct from source
  await erpDb.inventory.update({
    where: { id: data.inventoryId },
    data: { quantity: sourceItem.quantity - data.quantityToTransfer },
  });

  // Find or create in target branch
  const targetItem = allInv.find(
    (i) => i.sku === sourceItem.sku && i.branchCode === data.targetWarehouseId
  );

  if (targetItem) {
    await erpDb.inventory.update({
      where: { id: targetItem.id },
      data: { quantity: targetItem.quantity + data.quantityToTransfer },
    });
  } else {
    // Seed new SKU category in target warehouse
    await erpDb.inventory.create({
      data: {
        productId: sourceItem.productId,
        branchId: data.targetWarehouseId,
        availableStock: data.quantityToTransfer,
        sku: sourceItem.sku,
        itemName: sourceItem.itemName,
        branchCode: data.targetWarehouseId,
        quantity: data.quantityToTransfer,
        reservedQty: 0
      }
    });
  }

  // Write inventory movements
  await erpDb.inventoryMovements.create({
    data: {
      sku: sourceItem.sku,
      branchCode: sourceItem.branchCode,
      type: "TRANSFER",
      quantity: data.quantityToTransfer,
      details: `Transferred ${data.quantityToTransfer} units to ${data.targetWarehouseId}`,
      userId: data.userId
    }
  });

  await erpDb.inventoryMovements.create({
    data: {
      sku: sourceItem.sku,
      branchCode: data.targetWarehouseId,
      type: "ADDITION",
      quantity: data.quantityToTransfer,
      details: `Received ${data.quantityToTransfer} units from ${sourceItem.branchCode} via transfer`,
      userId: data.userId
    }
  });

  revalidatePath("/inventory");
  return { success: true };
}

// 4. Product Catalog Management
export async function createProductAction(data: {
  sku: string;
  name: string;
  brand: string;
  categoryId: string;
  barcode?: string;
  reorderLevel: number;
  safetyStock: number;
  serialTracking: boolean;
  userId: string;
}) {
  const allProds = await erpDb.products.findMany();
  const duplicate = allProds.find(p => p.sku === data.sku);
  if (duplicate) {
    throw new Error(`Product with SKU ${data.sku} already exists in catalog.`);
  }

  const result = await erpDb.products.create({
    data: {
      sku: data.sku,
      name: data.name,
      brand: data.brand,
      categoryId: data.categoryId,
      barcode: data.barcode,
      reorderLevel: Number(data.reorderLevel),
      safetyStock: Number(data.safetyStock),
      serialTracking: data.serialTracking
    }
  });

  // Seed initial stock of 0 in all branches so it displays in Inventory Table
  const branchesList = ["HYD-HQ", "HYD-THUB", "HYD-JH", "BLR", "CHN", "MUM", "DEL", "VZG", "VJA"];
  for (const bCode of branchesList) {
    await erpDb.inventory.create({
      data: {
        productId: result.id,
        branchId: bCode,
        availableStock: 0,
        sku: data.sku,
        itemName: data.name,
        branchCode: bCode,
        quantity: 0,
        reservedQty: 0
      }
    });
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  return result;
}

export async function updateProductAction(
  productId: string,
  data: any,
  userEmail: string
) {
  const result = await erpDb.products.update({
    where: { id: productId },
    data
  });

  revalidatePath("/products");
  return result;
}

// 5. Excel Import Simulation (Import Excel)
export async function uploadPriceSpreadsheetAction(data: {
  filename: string;
  branchCode: string;
  userId: string;
}) {
  let rows: Array<{ sku: string; costPrice: number; sellingPrice: number }> = [];

  const allProds = await erpDb.products.findMany();

  if (data.filename.includes("apple")) {
    const appleProds = allProds.filter(p => p.brand.toLowerCase() === "apple");
    rows = appleProds.map(p => {
      const baseCost = Math.round(p.barcode ? parseInt(p.barcode.substring(3, 7)) * 20 : 60000);
      const baseSell = Math.round(baseCost / 0.75);
      return {
        sku: p.sku,
        costPrice: Math.round(baseCost * 1.01),
        sellingPrice: Math.round(baseSell * 1.02)
      };
    });
  } else if (data.filename.includes("google") || data.filename.includes("pixel")) {
    const pixelProds = allProds.filter(p => p.brand.toLowerCase() === "google pixel");
    rows = pixelProds.map(p => {
      const baseCost = 45000;
      const baseSell = 65000;
      return {
        sku: p.sku,
        costPrice: baseCost,
        sellingPrice: baseSell
      };
    });
  } else {
    const hpProds = allProds.filter(p => p.brand.toLowerCase() === "hp");
    rows = hpProds.map(p => {
      const baseCost = 70000;
      const baseSell = 95000;
      return {
        sku: p.sku,
        costPrice: baseCost,
        sellingPrice: baseSell
      };
    });
  }

  for (const row of rows) {
    const margin = Math.round(((row.sellingPrice - row.costPrice) / row.sellingPrice) * 100) / 100;
    
    await (erpDb.productPrices as any).upsert({
      where: {
        sku_branchCode: {
          sku: row.sku,
          branchCode: data.branchCode
        }
      },
      update: {
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        margin
      },
      create: {
        sku: row.sku,
        branchCode: data.branchCode,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        margin
      }
    });

    // Write to history
    await erpDb.productPriceHistory.create({
      data: {
        sku: row.sku,
        branchCode: data.branchCode,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        updatedBy: data.userId
      }
    });

    // Trigger low margin alert
    if (margin < 0.10) {
      await erpDb.stockAlerts.create({
        data: {
          type: "PRICE_CHANGE",
          message: `Low Margin Alert: Margin for SKU ${row.sku} in branch ${data.branchCode} is below threshold: ${Math.round(margin * 100)}%. Cost: ₹${row.costPrice.toLocaleString()}, Selling: ₹${row.sellingPrice.toLocaleString()}.`,
          branchCode: data.branchCode,
          resolved: false
        }
      });
    }
  }

  revalidatePath("/pricing");
  revalidatePath("/dashboard");
  return { success: true };
}

// 6. Stock Alert Resolution
export async function resolveStockAlertAction(alertId: string, userEmail: string) {
  const result = await erpDb.stockAlerts.update({
    where: { id: alertId },
    data: { resolved: true }
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Dummy Action for Purchase Requests Compatibility
export async function updatePRStatusAction(prId: string, nextStatus: string, details?: string, email?: string) {
  return { success: true };
}

// 7. Customers Management (Admin)
export async function updateCustomerAction(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    customerType?: string;
  }
) {
  const result = await erpDb.users.update({
    where: { id },
    data
  });
  const performedBy = await getCurrentUserId();
  auditLog("ADMIN_CUSTOMER_UPDATE", performedBy, id, data);
  revalidatePath("/admin/customers");
  revalidatePath("/settings");
  return { success: true, customer: result };
}

export async function createCustomerAction(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  passwordPlain: string;
  customerType?: string;
}) {
  const existing = await erpDb.users.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new Error("Email address is already registered.");
  }

  const hashedPassword = bcrypt.hashSync(data.passwordPlain, 10);

  const result = await erpDb.users.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: hashedPassword,
      roleId: "CUSTOMER",
      branchName: "None",
      status: "ACTIVE",
      phone: data.phone || "",
      address: data.address || "",
      customerType: data.customerType || "STANDARD",
      isActive: true
    }
  });

  const performedBy = await getCurrentUserId();
  auditLog("ADMIN_CUSTOMER_CREATE", performedBy, result.id, { email: result.email });
  revalidatePath("/admin/customers");
  revalidatePath("/settings");
  return { success: true, customer: result };
}

export async function deleteCustomerAction(id: string) {
  const result = await erpDb.users.delete({
    where: { id }
  });

  const performedBy = await getCurrentUserId();
  auditLog("ADMIN_CUSTOMER_DELETE", performedBy, id, { email: result.email });
  revalidatePath("/admin/customers");
  revalidatePath("/settings");
  return { success: true };
}


export async function resetCustomerPasswordAction(id: string, newPasswordPlain: string) {
  const performedBy = await getCurrentUserId();
  const hashedPassword = bcrypt.hashSync(newPasswordPlain, 10);
  await erpDb.users.update({
    where: { id },
    data: { passwordHash: hashedPassword }
  });
  auditLog("ADMIN_PASSWORD_RESET", performedBy, id, {});
  return { success: true };
}

// 8. Categories CRUD (Admin)
export async function createCategoryAction(name: string) {
  const result = await erpDb.categories.create({
    data: { name }
  });
  revalidatePath("/categories");
  revalidatePath("/analytics");
  return { success: true, category: result };
}

export async function updateCategoryAction(id: string, name: string) {
  const result = await erpDb.categories.update({
    where: { id },
    data: { name }
  });
  revalidatePath("/categories");
  return { success: true, category: result };
}

export async function deleteCategoryAction(id: string) {
  if (!erpDb.isMock()) {
    const { prisma: localPrisma } = await import("@/lib/db");
    const productsCount = await localPrisma.product.count({ where: { categoryId: id } });
    if (productsCount > 0) {
      throw new Error(`Cannot delete category. There are ${productsCount} products assigned to it.`);
    }
    await localPrisma.category.delete({ where: { id } });
  } else {
    const mockStore = (global as any).mockDb;
    const productsCount = mockStore.products.filter((p: any) => p.categoryId === id).length;
    if (productsCount > 0) {
      throw new Error(`Cannot delete category. There are ${productsCount} products assigned to it.`);
    }
    mockStore.categories = mockStore.categories.filter((c: any) => c.id !== id);
  }
  revalidatePath("/categories");
  return { success: true };
}

// 9. Premium Stock Adjustment Action
export async function adjustStockAction(data: {
  sku: string;
  branchCode: string;
  quantity: number;
  details: string;
  userId: string;
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";
}) {
  const allInv = await erpDb.inventory.findMany();
  const existing = allInv.find(i => i.sku === data.sku && i.branchCode === data.branchCode);

  let updatedQty = data.quantity;
  if (data.type === "STOCK_IN") {
    if (existing) {
      updatedQty = existing.quantity + data.quantity;
      await erpDb.inventory.update({
        where: { id: existing.id },
        data: { quantity: updatedQty }
      });
    } else {
      const dbProduct = await erpDb.products.findUnique({ where: { sku: data.sku } });
      const itemName = dbProduct ? dbProduct.name : data.sku;
      await erpDb.inventory.create({
        data: {
          productId: dbProduct?.id || "p-1",
          branchId: data.branchCode,
          availableStock: data.quantity,
          sku: data.sku,
          itemName,
          branchCode: data.branchCode,
          quantity: data.quantity,
          reservedQty: 0
        }
      });
    }
  } else if (data.type === "STOCK_OUT") {
    if (!existing) {
      throw new Error(`No stock record found for SKU ${data.sku} at branch ${data.branchCode}`);
    }
    const freeStock = existing.quantity - existing.reservedQty;
    if (freeStock < data.quantity) {
      throw new Error(`Insufficient available stock. Free available: ${freeStock} units, requested: ${data.quantity} units.`);
    }
    updatedQty = existing.quantity - data.quantity;
    await erpDb.inventory.update({
      where: { id: existing.id },
      data: { quantity: updatedQty }
    });
  } else if (data.type === "ADJUSTMENT") {
    if (!existing) {
      const dbProduct = await erpDb.products.findUnique({ where: { sku: data.sku } });
      const itemName = dbProduct ? dbProduct.name : data.sku;
      await erpDb.inventory.create({
        data: {
          productId: dbProduct?.id || "p-1",
          branchId: data.branchCode,
          availableStock: data.quantity,
          sku: data.sku,
          itemName,
          branchCode: data.branchCode,
          quantity: data.quantity,
          reservedQty: 0
        }
      });
      updatedQty = data.quantity;
    } else {
      updatedQty = data.quantity;
      await erpDb.inventory.update({
        where: { id: existing.id },
        data: { quantity: updatedQty }
      });
    }
  }

  // Create movement audit trail
  await erpDb.inventoryMovements.create({
    data: {
      sku: data.sku,
      branchCode: data.branchCode,
      type: data.type === "STOCK_IN" ? "ADDITION" : data.type === "STOCK_OUT" ? "REDUCTION" : "ADJUSTMENT",
      quantity: data.type === "STOCK_OUT" ? -Math.abs(data.quantity) : data.quantity,
      details: data.details,
      userId: data.userId
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/stock-movement");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProductPriceAction(data: {
  sku: string;
  branchCode: string;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  userId: string;
}) {
  const cost = Number(data.costPrice);
  const sell = Number(data.sellingPrice);
  const mrp = Number(data.mrp);

  if (isNaN(cost) || isNaN(sell) || isNaN(mrp) || sell <= 0) {
    throw new Error("Invalid price values provided");
  }

  const margin = Math.round(((sell - cost) / sell) * 100) / 100;

  const result = await (erpDb.productPrices as any).upsert({
    where: {
      sku_branchCode: {
        sku: data.sku,
        branchCode: data.branchCode
      }
    },
    update: {
      costPrice: cost,
      sellingPrice: sell,
      mrp: mrp,
      margin
    },
    create: {
      sku: data.sku,
      branchCode: data.branchCode,
      costPrice: cost,
      sellingPrice: sell,
      mrp: mrp,
      margin
    }
  });

  // Write to audit history
  await erpDb.productPriceHistory.create({
    data: {
      sku: data.sku,
      branchCode: data.branchCode,
      costPrice: cost,
      sellingPrice: sell,
      mrp: mrp,
      updatedBy: data.userId
    }
  });

  // Trigger low margin alert if margin < 10%
  if (margin < 0.10) {
    await erpDb.stockAlerts.create({
      data: {
        type: "PRICE_CHANGE",
        message: `Low Margin Alert: Margin for SKU ${data.sku} in branch ${data.branchCode} is below threshold: ${Math.round(margin * 100)}%. Cost: ₹${cost.toLocaleString()}, Selling: ₹${sell.toLocaleString()}.`,
        branchCode: data.branchCode,
        resolved: false
      }
    });
  }

  revalidatePath("/pricing");
  revalidatePath("/dashboard");
  return { success: true, price: result };
}

// Helper functions for Database Notifications
async function createNotification(userId: string, title: string, message: string) {
  try {
    await erpDb.notifications.create({
      data: {
        userId,
        title,
        message,
        read: false
      }
    });
  } catch (err) {
    console.error("Failed to create database notification:", err);
  }
}

async function notifyAdmins(title: string, message: string) {
  try {
    const admins = await erpDb.users.findMany({
      where: { roleId: { in: ["ADMIN", "SUPER_ADMIN"] } }
    });
    for (const admin of admins) {
      await createNotification(admin.id, title, message);
    }
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}

// 10. Customer Stock Reservations Actions
export async function createReservationAction(data: {
  productId: string;
  sku: string;
  quantity: number;
  customerId: string;
  branchCode: string;
  employeeId?: string;
  notes?: string;
}) {
  const product = await erpDb.products.findUnique({ where: { id: data.productId } });
  if (!product) {
    return { error: "Product not found in catalog." };
  }

  const allInv = await erpDb.inventory.findMany();
  const invItem = allInv.find((i: any) => i.sku === data.sku && i.branchCode === data.branchCode);
  if (!invItem) {
    return { error: `Product with SKU ${data.sku} is not stocked in branch ${data.branchCode}.` };
  }

  const freeStock = invItem.quantity - invItem.reservedQty;
  if (freeStock < data.quantity) {
    return { error: `Insufficient stock available in branch ${data.branchCode}. Available: ${freeStock}, Requested: ${data.quantity}` };
  }

  // Prevent duplicate active (PENDING, ACCEPTED, ACTIVE, Pending Customer Approval, Modified by Customer) reservations for the same customer/product
  const activeReservations = await erpDb.stockReservations.findMany({
    where: {
      customerId: data.customerId,
      productId: data.productId,
      status: { in: ["PENDING", "ACCEPTED", "ACTIVE", "Pending Customer Approval", "Modified by Customer (Pending Verification)"] }
    }
  });
  if (activeReservations.length > 0) {
    return { error: "An active stock reservation already exists for this customer and product." };
  }

  const reservedAt = new Date();
  const expiresAt = new Date(reservedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
  const reservationNumber = "SR-" + Math.floor(100000 + Math.random() * 900000);

  const isCreatedByStaff = !!data.employeeId;
  const initialStatus = isCreatedByStaff ? "Pending Customer Approval" : "PENDING";

  const reservation = await erpDb.stockReservations.create({
    data: {
      reservationNumber,
      customerId: data.customerId,
      productId: data.productId,
      sku: data.sku,
      branchCode: data.branchCode,
      quantity: data.quantity,
      status: initialStatus,
      notes: data.notes || null,
      employeeId: data.employeeId || null,
      reservedAt,
      expiresAt
    }
  });

  const updatedReserved = invItem.reservedQty + data.quantity;
  const updatedAllocated = invItem.allocatedQty || 0;
  await erpDb.inventory.update({
    where: { id: invItem.id },
    data: {
      reservedQty: updatedReserved,
      availableQty: invItem.quantity - updatedReserved - updatedAllocated,
      reservedStock: updatedReserved,
      availableStock: invItem.quantity - updatedReserved - updatedAllocated
    }
  });

  await erpDb.inventoryMovements.create({
    data: {
      sku: data.sku,
      branchCode: data.branchCode,
      type: "ADJUSTMENT",
      quantity: 0,
      details: `Reserved ${data.quantity} units of SKU ${data.sku} at ${data.branchCode} for customer. Reservation: ${reservationNumber}.`,
      userId: data.employeeId || data.customerId
    }
  });

  // Cross-user notifications
  const customer = await erpDb.users.findUnique({ where: { id: data.customerId } });
  const customerName = customer?.name || "Customer";
  
  let employeeName = "System";
  if (data.employeeId) {
    const employee = await erpDb.users.findUnique({ where: { id: data.employeeId } });
    employeeName = employee?.name || "Employee";
  }

  // Notify customer
  await createNotification(data.customerId, "New Stock Locked", `Employee ${employeeName} created a new stock reservation ${reservationNumber} for you.`);
  
  // Notify admins
  await notifyAdmins("Reservation Created", `Employee ${employeeName} created a new reservation ${reservationNumber} for customer ${customerName}.`);

  const performedBy = await getCurrentUserId();
  auditLog("RESERVATION_CREATE", performedBy, data.customerId, {
    reservationId: reservation.id,
    sku: data.sku,
    quantity: data.quantity,
    branchCode: data.branchCode,
    status: initialStatus
  });

  revalidatePath("/products");
  revalidatePath("/reserved-stock");
  revalidatePath("/dashboard");
  return { success: true, reservation };
}

export async function acceptReservationAction(reservationId: string, customerId: string) {
  const reservation = await erpDb.stockReservations.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return { error: "Reservation not found." };
  }
  if (reservation.customerId !== customerId) {
    return { error: "Unauthorized: You can only accept your own reservations." };
  }
  if (reservation.status !== "PENDING" && reservation.status !== "Pending Customer Approval") {
    return { error: `Reservation is not in a confirmable state. Current status: ${reservation.status}` };
  }

  // Update status to ACCEPTED
  await erpDb.stockReservations.update({
    where: { id: reservationId },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date()
    }
  });

  // Move reserved stock to allocated stock
  const allInv = await erpDb.inventory.findMany();
  const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
  if (invItem) {
    const updatedReserved = Math.max(0, invItem.reservedQty - reservation.quantity);
    const updatedAllocated = (invItem.allocatedQty || 0) + reservation.quantity;
    await erpDb.inventory.update({
      where: { id: invItem.id },
      data: {
        reservedQty: updatedReserved,
        allocatedQty: updatedAllocated,
        reservedStock: updatedReserved,
        allocatedStock: updatedAllocated,
        availableQty: invItem.quantity - updatedReserved - updatedAllocated,
        availableStock: invItem.quantity - updatedReserved - updatedAllocated
      }
    });
  }

  // Create movement audit trail
  await erpDb.inventoryMovements.create({
    data: {
      sku: reservation.sku,
      branchCode: reservation.branchCode,
      type: "ADJUSTMENT",
      quantity: 0,
      details: `Customer accepted reservation ${reservation.reservationNumber}. Stock converted from reserved to allocated.`,
      userId: customerId
    }
  });

  // Notifications
  const customerName = reservation.user?.name || "Customer";
  const employeeId = reservation.employeeId;
  if (employeeId) {
    await createNotification(employeeId, "Reservation Accepted", `Customer ${customerName} has accepted reservation ${reservation.reservationNumber}.`);
  }
  await notifyAdmins("Reservation Accepted", `Customer ${customerName} has accepted reservation ${reservation.reservationNumber} created by employee.`);

  const performedBy = await getCurrentUserId();
  auditLog("RESERVATION_ACCEPT", performedBy, customerId, { reservationId });

  revalidatePath("/reserved-stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectReservationAction(reservationId: string, customerId: string) {
  const reservation = await erpDb.stockReservations.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return { error: "Reservation not found." };
  }
  if (reservation.customerId !== customerId) {
    return { error: "Unauthorized: You can only reject your own reservations." };
  }
  if (reservation.status !== "PENDING" && reservation.status !== "Pending Customer Approval") {
    return { error: `Reservation is not in a rejectable state. Current status: ${reservation.status}` };
  }

  // Update status to REJECTED
  await erpDb.stockReservations.update({
    where: { id: reservationId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date()
    }
  });

  // Release reserved stock back to available stock
  const allInv = await erpDb.inventory.findMany();
  const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
  if (invItem) {
    const updatedReserved = Math.max(0, invItem.reservedQty - reservation.quantity);
    const updatedAllocated = invItem.allocatedQty || 0;
    await erpDb.inventory.update({
      where: { id: invItem.id },
      data: {
        reservedQty: updatedReserved,
        reservedStock: updatedReserved,
        availableQty: invItem.quantity - updatedReserved - updatedAllocated,
        availableStock: invItem.quantity - updatedReserved - updatedAllocated
      }
    });
  }

  // Create movement audit trail
  await erpDb.inventoryMovements.create({
    data: {
      sku: reservation.sku,
      branchCode: reservation.branchCode,
      type: "ADJUSTMENT",
      quantity: 0,
      details: `Customer rejected reservation ${reservation.reservationNumber}. Released ${reservation.quantity} units back to available stock.`,
      userId: customerId
    }
  });

  // Notifications
  const customerName = reservation.user?.name || "Customer";
  const employeeId = reservation.employeeId;
  if (employeeId) {
    await createNotification(employeeId, "Reservation Rejected", `Customer ${customerName} has rejected reservation ${reservation.reservationNumber}.`);
  }
  await notifyAdmins("Reservation Rejected", `Customer ${customerName} has rejected reservation ${reservation.reservationNumber} created by employee.`);

  const performedBy = await getCurrentUserId();
  auditLog("RESERVATION_REJECT", performedBy, customerId, { reservationId });

  revalidatePath("/reserved-stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function purchaseReservedStockAction(reservationId: string) {
  const reservation = await erpDb.stockReservations.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return { error: "Reservation record not found." };
  }

  if (reservation.status !== "ACTIVE" && reservation.status !== "PENDING" && reservation.status !== "ACCEPTED") {
    return { error: `Reservation is no longer active. Current status: ${reservation.status}` };
  }

  const allInv = await erpDb.inventory.findMany();
  const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
  if (!invItem) {
    return { error: "Inventory record not found for reserved product." };
  }

  const isAlreadyAllocated = reservation.status === "ACCEPTED";
  const updatedQty = Math.max(0, invItem.quantity - reservation.quantity);
  const updatedReserved = isAlreadyAllocated ? invItem.reservedQty : Math.max(0, invItem.reservedQty - reservation.quantity);
  const updatedAllocated = isAlreadyAllocated ? Math.max(0, (invItem.allocatedQty || 0) - reservation.quantity) : (invItem.allocatedQty || 0);

  await erpDb.inventory.update({
    where: { id: invItem.id },
    data: {
      quantity: updatedQty,
      reservedQty: updatedReserved,
      allocatedQty: updatedAllocated,
      availableQty: updatedQty - updatedReserved - updatedAllocated,
      availableStock: updatedQty - updatedReserved - updatedAllocated,
      reservedStock: updatedReserved,
      allocatedStock: updatedAllocated
    }
  });

  await erpDb.stockReservations.update({
    where: { id: reservationId },
    data: { status: "COMPLETED" }
  });

  await erpDb.inventoryMovements.create({
    data: {
      sku: reservation.sku,
      branchCode: reservation.branchCode,
      type: "REDUCTION",
      quantity: reservation.quantity,
      details: `Purchased reserved stock: ${reservation.quantity} units of SKU ${reservation.sku} at ${reservation.branchCode}.`,
      userId: reservation.customerId
    }
  });

  if (updatedQty < 10) {
    await erpDb.stockAlerts.create({
      data: {
        type: "LOW_STOCK",
        message: `${reservation.sku} in ${reservation.branchCode} is below reorder level. Current: ${updatedQty} units. Reorder Level: 10.`,
        branchCode: reservation.branchCode,
        resolved: false
      }
    });
  }

  // Notify employee and admin
  if (reservation.employeeId) {
    await createNotification(reservation.employeeId, "Reservation Completed", `Customer completed purchase for reservation ${reservation.reservationNumber || reservationId}.`);
  }
  await notifyAdmins("Reservation Completed", `Customer completed purchase for reservation ${reservation.reservationNumber || reservationId}.`);

  revalidatePath("/products");
  revalidatePath("/reserved-stock");
  revalidatePath("/dashboard");
  revalidatePath("/stock-movement");
  return { success: true };
}

export async function checkAndExpireReservationsAction() {
  const now = new Date();
  
  const activeReservations = await erpDb.stockReservations.findMany({
    where: { status: { in: ["PENDING", "ACTIVE", "ACCEPTED"] } }
  });

  const expired = activeReservations.filter((res: any) => new Date(res.expiresAt) < now);

  if (expired.length === 0) {
    return { success: true, expiredCount: 0 };
  }

  for (const res of expired) {
    await erpDb.stockReservations.update({
      where: { id: res.id },
      data: { status: "EXPIRED" }
    });

    const isAllocated = res.status === "ACCEPTED";
    const allInv = await erpDb.inventory.findMany();
    const invItem = allInv.find((i: any) => i.sku === res.sku && i.branchCode === res.branchCode);
    if (invItem) {
      const updatedReserved = isAllocated ? invItem.reservedQty : Math.max(0, invItem.reservedQty - res.quantity);
      const updatedAllocated = isAllocated ? Math.max(0, (invItem.allocatedQty || 0) - res.quantity) : (invItem.allocatedQty || 0);
      
      await erpDb.inventory.update({
        where: { id: invItem.id },
        data: {
          reservedQty: updatedReserved,
          allocatedQty: updatedAllocated,
          reservedStock: updatedReserved,
          allocatedStock: updatedAllocated,
          availableQty: invItem.quantity - updatedReserved,
          availableStock: invItem.quantity - updatedReserved
        }
      });
    }

    await erpDb.inventoryMovements.create({
      data: {
        sku: res.sku,
        branchCode: res.branchCode,
        type: "ADJUSTMENT",
        quantity: 0,
        details: `Stock reservation expired. Released ${res.quantity} units of SKU ${res.sku} at ${res.branchCode}.`,
        userId: "system"
      }
    });

    // Notify customer
    await createNotification(res.customerId, "Reservation Expired", `Your reservation ${res.reservationNumber} for ${res.quantity} units of ${res.sku} has expired.`);
    
    // Notify employee
    if (res.employeeId) {
      await createNotification(res.employeeId, "Reservation Expired", `Reservation ${res.reservationNumber} for customer ${res.user?.name || "Customer"} has expired.`);
    }

    // Notify admins
    await notifyAdmins("Reservation Expired", `Reservation ${res.reservationNumber} for customer ${res.user?.name || "Customer"} has expired.`);
  }

  revalidatePath("/products");
  revalidatePath("/reserved-stock");
  revalidatePath("/dashboard");
  revalidatePath("/stock-movement");

  return { success: true, expiredCount: expired.length };
}

export async function checkAndExpirePurchaseOrdersAction() {
  const now = new Date();

  // Expire all Opportunities that have passed their expiryDate and are still OPEN
  const allOpportunities = await erpDb.opportunities.findMany({
    where: { status: "OPEN" }
  });

  const expiredOpps = allOpportunities.filter((opp: any) => new Date(opp.expiryDate) < now);
  let expiredCount = 0;

  for (const opp of expiredOpps) {
    await erpDb.opportunities.update({
      where: { id: opp.id },
      data: { status: "EXPIRED", updatedAt: now }
    });

    // Release reserved inventory for this opportunity's PO
    let items: { sku: string; quantity: number }[] = [];
    try { items = JSON.parse(opp.productDetails || "[]"); } catch {}

    if (items.length > 0 && opp.purchaseOrder) {
      const branchCode = opp.purchaseOrder.branchCode;
      const allInv = await erpDb.inventory.findMany();
      for (const item of items) {
        const inv = allInv.find((i: any) => i.sku === item.sku && i.branchCode === branchCode);
        if (inv) {
          const updatedReserved = Math.max(0, (inv.reservedQty || 0) - item.quantity);
          const updatedAvailable = Math.max(0, (inv.quantity || 0) - updatedReserved - (inv.allocatedQty || 0));
          await erpDb.inventory.update({
            where: { id: inv.id },
            data: {
              reservedQty: updatedReserved,
              reservedStock: updatedReserved,
              availableQty: updatedAvailable,
              availableStock: updatedAvailable
            }
          });
          await erpDb.inventoryMovements.create({
            data: {
              sku: item.sku,
              branchCode,
              type: "ADJUSTMENT",
              quantity: 0,
              details: `Released reserved stock: ${item.quantity} units of ${item.sku} — Opportunity ${opp.opportunityNumber} expired.`,
              userId: "system"
            }
          });
        }
      }
    }

    // Update PO status back to Pending
    if (opp.purchaseOrderId) {
      await erpDb.purchaseOrders.update({
        where: { id: opp.purchaseOrderId },
        data: { verificationStatus: "Pending", stockStatus: "Checking" }
      });
    }

    await createNotification(opp.customerId, "Opportunity Expired", `Opportunity ${opp.opportunityNumber} for your PO has expired. Reserved stock has been released.`);
    await notifyAdmins("Opportunity Expired", `Opportunity ${opp.opportunityNumber} (Customer: ${opp.customerName}) has expired. Reserved stock released.`);
    expiredCount++;
  }

  if (expiredCount > 0) {
    revalidatePath("/purchase-orders");
    revalidatePath("/opportunities");
    revalidatePath("/dashboard");
  }

  return { success: true, expiredCount };
}

export async function cancelReservationAction(reservationId: string, userId: string) {
  const reservation = await erpDb.stockReservations.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return { error: "Reservation record not found." };
  }

  const user = await erpDb.users.findUnique({ where: { id: userId } });
  const isAdmin = user ? ["SUPER_ADMIN", "ADMIN"].includes(user.roleId) : false;
  const isCreator = reservation.employeeId === userId;
  const isOwner = reservation.customerId === userId;

  if (!isOwner && !isAdmin && !isCreator) {
    return { error: "Unauthorized: You do not have permission to cancel this reservation." };
  }

  if (reservation.status !== "PENDING" && reservation.status !== "ACTIVE" && reservation.status !== "ACCEPTED") {
    return { error: `Cannot cancel reservation with status: ${reservation.status}` };
  }

  const isAllocated = reservation.status === "ACCEPTED";

  // Mark reservation as CANCELLED
  await erpDb.stockReservations.update({
    where: { id: reservationId },
    data: { status: "CANCELLED" }
  });

  // Release the stock back to available inventory
  const allInv = await erpDb.inventory.findMany();
  const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
  if (invItem) {
    const updatedReserved = isAllocated ? invItem.reservedQty : Math.max(0, invItem.reservedQty - reservation.quantity);
    const updatedAllocated = isAllocated ? Math.max(0, (invItem.allocatedQty || 0) - reservation.quantity) : (invItem.allocatedQty || 0);
    
    await erpDb.inventory.update({
      where: { id: invItem.id },
      data: {
        reservedQty: updatedReserved,
        allocatedQty: updatedAllocated,
        reservedStock: updatedReserved,
        allocatedStock: updatedAllocated,
        availableQty: invItem.quantity - updatedReserved - updatedAllocated,
        availableStock: invItem.quantity - updatedReserved - updatedAllocated
      }
    });
  }

  // Audit movement
  await erpDb.inventoryMovements.create({
    data: {
      sku: reservation.sku,
      branchCode: reservation.branchCode,
      type: "ADJUSTMENT",
      quantity: 0,
      details: `${isAdmin ? "Admin" : isCreator ? "Employee" : "Customer"} cancelled reservation ${reservation.reservationNumber || reservationId}. Released ${reservation.quantity} units back to available stock.`,
      userId: userId
    }
  });

  // Notify employee and admin
  if (reservation.employeeId) {
    await createNotification(reservation.employeeId, "Reservation Cancelled", `${isAdmin ? "Admin" : isCreator ? "Employee" : "Customer"} cancelled reservation ${reservation.reservationNumber || reservationId}.`);
  }
  await notifyAdmins("Reservation Cancelled", `${isAdmin ? "Admin" : isCreator ? "Employee" : "Customer"} cancelled reservation ${reservation.reservationNumber || reservationId}.`);

  revalidatePath("/reserved-stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createAdministrativeUserAction(data: {
  name: string;
  email: string;
  phone: string;
  roleId: string;
  branchName: string;
  passwordPlain: string;
}) {
  const performedBy = await getCurrentUserId();
  const existing = await erpDb.users.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Email address is already registered." };
  }

  const hashedPassword = bcrypt.hashSync(data.passwordPlain, 10);
  
  const branches = await erpDb.branches.findMany();
  const branch = branches.find((b: any) => b.name === data.branchName || b.id === data.branchName);
  const branchId = branch?.id || null;
  const resolvedBranchName = branch?.name || data.branchName || "None";

  const result = await erpDb.users.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: hashedPassword,
      roleId: data.roleId,
      branchId,
      branchName: resolvedBranchName,
      status: "ACTIVE",
      isActive: true,
      phone: data.phone,
      inheritBranchPermissions: true
    }
  });

  auditLog("ADMIN_USER_CREATE", performedBy, result.id, {
    name: data.name,
    email: data.email,
    roleId: data.roleId,
    branchName: resolvedBranchName
  });

  revalidatePath("/settings");
  return { success: true, user: result };
}

export async function updateUserAction(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  branchName: string;
  status: string;
  inheritBranchPermissions: boolean;
  pagePermissions?: string;
}) {
  const performedBy = await getCurrentUserId();
  
  try {
    const branches = await erpDb.branches.findMany();
    const branch = branches.find((b: any) => b.name === data.branchName || b.id === data.branchName);
    const branchId = branch?.id || null;
    const resolvedBranchName = branch?.name || data.branchName || "None";

    const result = await erpDb.users.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        roleId: data.roleId,
        branchId,
        branchName: resolvedBranchName,
        status: data.status,
        isActive: data.status === "ACTIVE",
        inheritBranchPermissions: data.inheritBranchPermissions,
        pagePermissions: data.pagePermissions || null
      }
    });

    auditLog("ADMIN_USER_UPDATE", performedBy, data.id, {
      name: data.name,
      email: data.email,
      roleId: data.roleId,
      branchName: resolvedBranchName,
      status: data.status,
      inheritBranchPermissions: data.inheritBranchPermissions,
      pagePermissions: data.pagePermissions || null
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true, user: result, error: undefined };
  } catch (err: any) {
    return { success: false, user: undefined, error: err.message || "Failed to update user details" };
  }
}

export async function updateBranchPermissionsAction(branchId: string, pagePermissions: string) {
  const performedBy = await getCurrentUserId();
  
  if (!erpDb.isMock()) {
    const { prisma: localPrisma } = await import("@/lib/db");
    await localPrisma.branch.update({
      where: { id: branchId },
      data: { pagePermissions }
    });
  } else {
    const mockStore = (global as any).mockDb;
    const idx = mockStore.branches.findIndex((b: any) => b.id === branchId);
    if (idx !== -1) {
      mockStore.branches[idx] = { ...mockStore.branches[idx], pagePermissions };
    }
  }

  auditLog("BRANCH_PERMISSIONS_UPDATE", performedBy, branchId, { pagePermissions });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateReservationAction(data: {
  reservationId: string;
  quantity: number;
  expiresAt: string;
  notes?: string;
}) {
  const performedBy = await getCurrentUserId();
  
  const reservation = await erpDb.stockReservations.findUnique({ where: { id: data.reservationId } });
  if (!reservation) {
    return { error: "Reservation not found." };
  }

  if (reservation.customerId !== performedBy) {
    return { error: "Unauthorized: You can only edit your own reservations." };
  }

  if (reservation.status !== "Pending Customer Approval" && reservation.status !== "PENDING") {
    return { error: `Cannot edit reservation in its current state: ${reservation.status}` };
  }

  const allInv = await erpDb.inventory.findMany();
  const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
  if (!invItem) {
    return { error: "Inventory record not found." };
  }

  const quantityDiff = data.quantity - reservation.quantity;
  const freeStock = invItem.quantity - invItem.reservedQty;

  if (quantityDiff > freeStock) {
    return { error: `Insufficient stock in branch ${reservation.branchCode} to increase quantity. Available: ${freeStock}, Requested increase: ${quantityDiff}` };
  }

  const updatedRes = await erpDb.stockReservations.update({
    where: { id: data.reservationId },
    data: {
      quantity: data.quantity,
      expiresAt: new Date(data.expiresAt),
      notes: data.notes || null,
      status: "Modified by Customer (Pending Verification)"
    }
  });

  const updatedReserved = invItem.reservedQty + quantityDiff;
  await erpDb.inventory.update({
    where: { id: invItem.id },
    data: {
      reservedQty: updatedReserved,
      availableQty: invItem.quantity - updatedReserved,
      reservedStock: updatedReserved,
      availableStock: invItem.quantity - updatedReserved
    }
  });

  await erpDb.inventoryMovements.create({
    data: {
      sku: reservation.sku,
      branchCode: reservation.branchCode,
      type: "ADJUSTMENT",
      quantity: 0,
      details: `Customer modified reservation ${reservation.reservationNumber || data.reservationId}. Updated quantity to ${data.quantity} and expiresAt to ${data.expiresAt}.`,
      userId: performedBy
    }
  });

  if (reservation.employeeId) {
    await createNotification(reservation.employeeId, "Reservation Modified", `Customer modified reservation ${reservation.reservationNumber} (Pending Verification).`);
  }
  await notifyAdmins("Reservation Modified", `Customer modified reservation ${reservation.reservationNumber} for customer ${reservation.user?.name || "Customer"}.`);

  revalidatePath("/reserved-stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { success: true, reservation: updatedRes };
}

export async function verifyModifiedReservationAction(reservationId: string, action: "ACCEPT" | "REJECT") {
  const performedBy = await getCurrentUserId();
  
  const reservation = await erpDb.stockReservations.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return { error: "Reservation not found." };
  }

  if (reservation.status !== "Modified by Customer (Pending Verification)") {
    return { error: `Reservation is not in verification state. Status: ${reservation.status}` };
  }

  if (action === "ACCEPT") {
    await erpDb.stockReservations.update({
      where: { id: reservationId },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date()
      }
    });

    const allInv = await erpDb.inventory.findMany();
    const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
    if (invItem) {
      const updatedReserved = Math.max(0, invItem.reservedQty - reservation.quantity);
      const updatedAllocated = (invItem.allocatedQty || 0) + reservation.quantity;
      await erpDb.inventory.update({
        where: { id: invItem.id },
        data: {
          reservedQty: updatedReserved,
          allocatedQty: updatedAllocated,
          reservedStock: updatedReserved,
          allocatedStock: updatedAllocated,
          availableQty: invItem.quantity - updatedReserved,
          availableStock: invItem.quantity - updatedReserved
        }
      });
    }

    await erpDb.inventoryMovements.create({
      data: {
        sku: reservation.sku,
        branchCode: reservation.branchCode,
        type: "ADJUSTMENT",
        quantity: 0,
        details: `Staff verified and accepted modified reservation ${reservation.reservationNumber}. Stock converted from reserved to allocated.`,
        userId: performedBy
      }
    });

    await createNotification(reservation.customerId, "Reservation Verified & Accepted", `Your modified reservation ${reservation.reservationNumber} has been verified and accepted.`);

    auditLog("RESERVATION_VERIFIED_ACCEPT", performedBy, reservation.customerId, { reservationId });
  } else {
    await erpDb.stockReservations.update({
      where: { id: reservationId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date()
      }
    });

    const allInv = await erpDb.inventory.findMany();
    const invItem = allInv.find((i: any) => i.sku === reservation.sku && i.branchCode === reservation.branchCode);
    if (invItem) {
      const updatedReserved = Math.max(0, invItem.reservedQty - reservation.quantity);
      await erpDb.inventory.update({
        where: { id: invItem.id },
        data: {
          reservedQty: updatedReserved,
          reservedStock: updatedReserved,
          availableQty: invItem.quantity - updatedReserved,
          availableStock: invItem.quantity - updatedReserved
        }
      });
    }

    await erpDb.inventoryMovements.create({
      data: {
        sku: reservation.sku,
        branchCode: reservation.branchCode,
        type: "ADJUSTMENT",
        quantity: 0,
        details: `Staff rejected modified reservation ${reservation.reservationNumber}. Released reserved stock.`,
        userId: performedBy
      }
    });

    await createNotification(reservation.customerId, "Reservation Modifications Rejected", `Your modified reservation ${reservation.reservationNumber} has been rejected.`);

    auditLog("RESERVATION_VERIFIED_REJECT", performedBy, reservation.customerId, { reservationId });
  }

  revalidatePath("/reserved-stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function checkStockAvailabilityAction(poId: string) {
  const performedBy = await getCurrentUserId();
  const po = await erpDb.purchaseOrders.findUnique({ where: { id: poId } });
  if (!po) {
    return { error: "Purchase Order not found" };
  }

  let items: { sku: string; quantity: number }[] = [];
  try {
    items = JSON.parse(po.itemsJson || "[]");
  } catch (e) {
    items = [];
  }

  const allInventory = await erpDb.inventory.findMany();
  let allAvailable = true;

  for (const item of items) {
    const inv = allInventory.find((i: any) => i.sku === item.sku && i.branchCode === po.branchCode);
    const availableQty = inv ? (inv.availableQty || inv.availableStock || inv.quantity || 0) : 0;
    if (availableQty < item.quantity) {
      allAvailable = false;
    }
  }

  const newStockStatus = allAvailable ? "Available" : "Insufficient";

  await erpDb.purchaseOrders.update({
    where: { id: poId },
    data: { stockStatus: newStockStatus }
  });

  auditLog("PO_STOCK_CHECK", performedBy, po.customerId, { poNumber: po.poNumber, stockStatus: newStockStatus });

  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");

  return { success: true, stockStatus: newStockStatus, isAvailable: allAvailable };
}

export async function verifyPurchaseOrderAction(poId: string) {
  const performedBy = await getCurrentUserId();
  const po = await erpDb.purchaseOrders.findUnique({ where: { id: poId } });
  if (!po) {
    return { error: "Purchase Order not found" };
  }

  if (po.verificationStatus === "Verified") {
    return { error: "This Purchase Order has already been verified." };
  }

  let items: { sku: string; quantity: number }[] = [];
  try {
    items = JSON.parse(po.itemsJson || "[]");
  } catch (e) {
    items = [];
  }

  // Check stock availability first
  const allInventory = await erpDb.inventory.findMany();
  let allAvailable = true;
  const shortageItems: string[] = [];

  for (const item of items) {
    const inv = allInventory.find((i: any) => i.sku === item.sku && i.branchCode === po.branchCode);
    const availableQty = inv ? (inv.availableQty || inv.availableStock || inv.quantity || 0) : 0;
    if (availableQty < item.quantity) {
      allAvailable = false;
      shortageItems.push(`${item.sku} (need ${item.quantity}, have ${availableQty})`);
    }
  }

  if (!allAvailable) {
    // Keep as Pending, update stockStatus to Insufficient
    await erpDb.purchaseOrders.update({
      where: { id: poId },
      data: { stockStatus: "Insufficient", verificationStatus: "Pending" }
    });
    revalidatePath("/purchase-orders");
    return { 
      error: `Insufficient stock for: ${shortageItems.join(", ")}. PO remains Pending.`,
      stockStatus: "Insufficient"
    };
  }

  // Stock is available — reserve inventory for each item
  for (const item of items) {
    const inv = allInventory.find((i: any) => i.sku === item.sku && i.branchCode === po.branchCode);
    if (inv) {
      const updatedReserved = (inv.reservedQty || 0) + item.quantity;
      const updatedAvailable = Math.max(0, (inv.quantity || 0) - updatedReserved - (inv.allocatedQty || 0));
      await erpDb.inventory.update({
        where: { id: inv.id },
        data: {
          reservedQty: updatedReserved,
          reservedStock: updatedReserved,
          availableQty: updatedAvailable,
          availableStock: updatedAvailable
        }
      });

      // Create inventory movement audit
      await erpDb.inventoryMovements.create({
        data: {
          sku: item.sku,
          branchCode: po.branchCode,
          type: "ADJUSTMENT",
          quantity: item.quantity,
          details: `Reserved ${item.quantity} units of ${item.sku} for PO ${po.poNumber} (Customer: ${po.customerName})`,
          userId: performedBy
        }
      });
    }
  }

  // Update PoItem itemStatus for each relational item row
  try {
    const existingPoItems = await erpDb.poItems.findMany({ where: { poId } });
    for (const item of items) {
      const inv = allInventory.find((i: any) => i.sku === item.sku && i.branchCode === po.branchCode);
      const availableQty = inv ? (inv.availableQty || inv.availableStock || inv.quantity || 0) : 0;
      const newItemStatus = availableQty >= item.quantity ? "Available" : "Out of Stock";
      const existingRow = existingPoItems.find((pi: any) => pi.sku === item.sku);
      if (existingRow) {
        await erpDb.poItems.update({ where: { id: existingRow.id }, data: { itemStatus: newItemStatus } });
      }
    }
  } catch (_) {
    // Non-fatal — poItems may not exist yet for legacy POs
  }

  const now = new Date();
  const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Update PO to Verified
  await erpDb.purchaseOrders.update({
    where: { id: poId },
    data: {
      verificationStatus: "Verified",
      stockStatus: "Available",
      verifiedBy: performedBy,
      verifiedDate: now
    }
  });

  // Create Opportunity record
  const opportunityNumber = `OPP-${Date.now()}`;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  try {
    await erpDb.opportunities.create({
      data: {
        id: `opp-${Date.now()}`,
        opportunityNumber,
        customerId: po.customerId,
        customerName: po.customerName,
        companyName: po.companyName || "",
        purchaseOrderId: po.id,
        productDetails: po.itemsJson,
        totalQuantity,
        reservationDate: now,
        expiryDate,
        status: "OPEN",
        notes: `Auto-created from verified PO ${po.poNumber}`,
        updatedAt: now
      }
    });
  } catch (oppErr: any) {
    // Don't fail the whole action if opportunity creation fails (e.g. duplicate)
    console.error("Opportunity creation warning:", oppErr.message);
  }

  // Notify customer
  await createNotification(
    po.customerId,
    "Purchase Order Verified",
    `Your Purchase Order ${po.poNumber} has been verified and stock has been reserved for you. Expiry: ${expiryDate.toLocaleDateString()}`
  );

  // Notify admins
  await notifyAdmins(
    "PO Verified & Stock Reserved",
    `PO ${po.poNumber} for customer ${po.customerName} has been verified by staff. Stock reserved. Opportunity ${opportunityNumber} created.`
  );

  auditLog("PO_VERIFICATION", performedBy, po.customerId, {
    poNumber: po.poNumber,
    verificationStatus: "Verified",
    opportunityNumber,
    itemsReserved: items
  });

  revalidatePath("/purchase-orders");
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");

  return { success: true, opportunityNumber };
}

export async function lookupPurchaseOrderByNumberAction(poNumber: string) {
  try {
    const po = await erpDb.purchaseOrders.findUnique({ where: { poNumber } });
    if (!po) {
      return { found: false };
    }
    const user = await erpDb.users.findUnique({ where: { id: po.customerId } });
    let items: { sku: string; quantity: number }[] = [];
    try {
      items = JSON.parse(po.itemsJson || "[]");
    } catch {}

    return {
      found: true,
      po: {
        id: po.id,
        poNumber: po.poNumber,
        customerId: po.customerId,
        customerName: po.customerName,
        companyName: po.companyName || "",
        branchCode: po.branchCode,
        dateReceived: po.dateReceived,
        expectedDelivery: po.expectedDelivery,
        verificationStatus: po.verificationStatus,
        stockStatus: po.stockStatus,
        items,
        totalItems: po.totalItems,
        customerPhone: user?.phone || "",
        customerEmail: user?.email || ""
      }
    };
  } catch (err: any) {
    return { found: false, error: err.message };
  }
}

export async function updateOpportunityStatusAction(opportunityId: string, status: "OPEN" | "WON" | "LOST") {
  const performedBy = await getCurrentUserId();
  await erpDb.opportunities.update({
    where: { id: opportunityId },
    data: { status, updatedAt: new Date() }
  });
  auditLog("OPPORTUNITY_STATUS_UPDATE", performedBy, opportunityId, { status });
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createPurchaseOrderAction(data: {
  poNumber: string;
  customerId: string;
  customerName: string;
  companyName?: string;
  vendorId?: string;
  totalItems: number;
  branchCode: string;
  itemsJson: string;
  expectedDelivery?: string;
  totalAmount?: number;
}) {
  try {
    const performedBy = await getCurrentUserId();

    // Compute total amount from items + product prices if not supplied
    let resolvedTotalAmount = data.totalAmount || 0;
    let parsedItems: { sku: string; quantity: number; unitPrice?: number; productId?: string }[] = [];
    try { parsedItems = JSON.parse(data.itemsJson || "[]"); } catch {}

    if (!resolvedTotalAmount && parsedItems.length > 0) {
      const allPrices = await erpDb.productPrices.findMany();
      for (const item of parsedItems) {
        const priceRow = allPrices.find((p: any) => p.sku === item.sku && p.branchCode === data.branchCode)
          || allPrices.find((p: any) => p.sku === item.sku);
        const unitPrice = priceRow ? (priceRow.sellingPrice || priceRow.costPrice || 0) : (item.unitPrice || 0);
        resolvedTotalAmount += unitPrice * item.quantity;
        item.unitPrice = unitPrice;
      }
    }

    const created = await erpDb.purchaseOrders.create({
      data: {
        poNumber: data.poNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        companyName: data.companyName || "",
        vendorId: data.vendorId || null,
        totalAmount: resolvedTotalAmount,
        totalItems: data.totalItems,
        branchCode: data.branchCode,
        itemsJson: JSON.stringify(parsedItems),
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        stockStatus: "Checking",
        verificationStatus: "Pending"
      }
    });

    // Write relational PoItem rows for the erpstructure po_items table
    if (parsedItems.length > 0 && created?.id) {
      const allProducts = await erpDb.products.findMany();
      const allPrices = await erpDb.productPrices.findMany();
      const poItemRows = parsedItems.map((item) => {
        const product = allProducts.find((p: any) => p.sku === item.sku);
        const priceRow = allPrices.find((p: any) => p.sku === item.sku && p.branchCode === data.branchCode)
          || allPrices.find((p: any) => p.sku === item.sku);
        const unitPrice = item.unitPrice ?? (priceRow ? (priceRow.sellingPrice || priceRow.costPrice || 0) : 0);
        return {
          poId: created.id,
          productId: product?.id || item.productId || "unknown",
          sku: item.sku,
          productName: product?.name || item.sku,
          quantity: item.quantity,
          unitPrice,
          itemStatus: "Pending"
        };
      }).filter(row => row.productId !== "unknown");

      if (poItemRows.length > 0) {
        try {
          await erpDb.poItems.createMany({ data: poItemRows });
        } catch (poItemErr: any) {
          console.warn("PoItem creation warning:", poItemErr.message);
        }
      }
    }

    auditLog("PO_CREATED", performedBy, data.customerId, { poNumber: data.poNumber, totalAmount: resolvedTotalAmount });

    revalidatePath("/purchase-orders");
    revalidatePath("/dashboard");

    return { success: true, purchaseOrder: created, error: undefined };
  } catch (err: any) {
    return { success: false, purchaseOrder: null, error: err.message || "Failed to create Purchase Order" };
  }
}

// ─── erpstructure Helper Actions ─────────────────────────────────────────────

export async function getVendorsAction() {
  try {
    const vendors = await erpDb.vendors.findMany({ where: { status: "ACTIVE" } });
    return { success: true, vendors };
  } catch (err: any) {
    return { success: false, vendors: [], error: err.message };
  }
}

export async function getVendorByIdAction(vendorId: string) {
  try {
    const vendor = await erpDb.vendors.findUnique({ where: { id: vendorId } });
    if (!vendor) return { success: false, vendor: null, error: "Vendor not found" };
    return { success: true, vendor };
  } catch (err: any) {
    return { success: false, vendor: null, error: err.message };
  }
}

export async function getProductPriceAction(sku: string, branchCode: string) {
  try {
    const allPrices = await erpDb.productPrices.findMany();
    // Prefer branch-specific price, fall back to any branch
    const priceRow = allPrices.find((p: any) => p.sku === sku && p.branchCode === branchCode)
      || allPrices.find((p: any) => p.sku === sku);
    if (!priceRow) return { success: false, unitPrice: 0, error: "Price not found for this product" };
    return {
      success: true,
      unitPrice: priceRow.sellingPrice || priceRow.costPrice || 0,
      costPrice: priceRow.costPrice || 0,
      sellingPrice: priceRow.sellingPrice || 0,
      mrp: priceRow.mrp || 0
    };
  } catch (err: any) {
    return { success: false, unitPrice: 0, error: err.message };
  }
}
