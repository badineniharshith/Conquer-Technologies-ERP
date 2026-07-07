import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Global cache for Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface MockDbState {
  users: any[];
  roles: any[];
  inventory: any[];
  branches: any[];
  categories: any[];
  products: any[];
  inventoryMovements: any[];
  stockAlerts: any[];
  productPrices: any[];
  productPriceHistory: any[];
  chatSessions: any[];
  chatMessages: any[];
  aiQueryLogs: any[];
  aiAuditLogs: any[];
  stockReservations: any[];
  notifications: any[];
  purchaseOrders: any[];
}

const hashPassword = (plain: string) => bcrypt.hashSync(plain, 10);

const initialRoles = [
  { id: "SUPER_ADMIN", name: "SUPER_ADMIN" },
  { id: "ADMIN", name: "ADMIN" },
  { id: "EMPLOYEE", name: "EMPLOYEE" },
  { id: "CUSTOMER", name: "CUSTOMER" }
];

const initialUsers = [
  { id: "u-superadmin", name: "Corporate Super Admin", email: "superadmin@conquererp.com", passwordHash: hashPassword("Admin@2026#Secure"), roleId: "SUPER_ADMIN", branch: "Head Office", status: "ACTIVE" },
  { id: "u-admin", name: "System Admin", email: "admin@conquererp.com", passwordHash: hashPassword("Admin@2026"), roleId: "ADMIN", branch: "Head Office", status: "ACTIVE" },
  { id: "u-saleshead", name: "Global Sales Head", email: "saleshead@conquererp.com", passwordHash: hashPassword("SalesHead@2026"), roleId: "EMPLOYEE", branch: "Head Office", status: "ACTIVE" },
  { id: "u-rsm-south", name: "Regional Manager South", email: "rsm.south@conquererp.com", passwordHash: hashPassword("RSM@South2026"), roleId: "EMPLOYEE", branch: "Head Office", status: "ACTIVE" },
  { id: "u-bm-hyd", name: "Hyderabad Branch Manager", email: "bm.hyd@conquererp.com", passwordHash: hashPassword("BM@Hyd2026"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-salesmgr", name: "Sales Manager HYD", email: "manager.hyd@conquererp.com", passwordHash: hashPassword("Manager@Hyd2026"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-exec-hyd", name: "Sales Executive HYD", email: "exec.hyd@conquererp.com", passwordHash: hashPassword("Exec@Hyd#2026"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-employee-generic", name: "Company Employee", email: "employee@conquererp.com", passwordHash: hashPassword("Employee@2026"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-customer", name: "Premium Customer", email: "customer@gmail.com", passwordHash: hashPassword("Customer#2026"), roleId: "CUSTOMER", branch: "None", status: "ACTIVE", assignedEmployeeId: "u-salesmgr" }
];

import { generateLargeDatabase } from "./largeCatalog";

const {
  categories: largeCategories,
  products: largeProducts,
  productPrices: largeProductPrices,
  productPriceHistory: largeProductPriceHistory,
  inventory: largeInventory
} = generateLargeDatabase();

const initialBranches = [
  { id: "HYD-HQ", name: "Hyderabad Corporate Office" },
  { id: "HYD-THUB", name: "Hyderabad T-Hub Experience Center" },
  { id: "HYD-JH", name: "Hyderabad Jubilee Hills" },
  { id: "BLR", name: "Bengaluru HSR Layout" },
  { id: "CHN", name: "Chennai Anna Nagar" },
  { id: "MUM", name: "Mumbai Worli" },
  { id: "DEL", name: "Gurgaon Delhi NCR" },
  { id: "VZG", name: "Visakhapatnam" },
  { id: "VJA", name: "Vijayawada" }
];

const initialCategories = largeCategories;
const initialProducts = largeProducts;
const initialProductPrices = largeProductPrices;
const initialProductPriceHistory = largeProductPriceHistory;
const initialInventory = largeInventory;

const initialStockAlerts: any[] = [];

const globalForMockDb = global as unknown as { mockDb: MockDbState };

if (!globalForMockDb.mockDb) {
  globalForMockDb.mockDb = {
    users: initialUsers,
    roles: initialRoles,
    inventory: initialInventory,
    branches: initialBranches,
    categories: initialCategories,
    products: initialProducts,
    inventoryMovements: [],
    stockAlerts: initialStockAlerts,
    productPrices: initialProductPrices,
    productPriceHistory: initialProductPriceHistory,
    chatSessions: [],
    chatMessages: [],
    aiQueryLogs: [],
    aiAuditLogs: [],
    stockReservations: [],
    notifications: [],
    purchaseOrders: [
      { id: "po-1", poNumber: "PO-2026-001", customerId: "u-customer", customerName: "Premium Customer", dateReceived: new Date("2026-07-01"), totalItems: 3, stockStatus: "Checking", verificationStatus: "Pending", branchCode: "HYD-HQ", itemsJson: JSON.stringify([{ sku: "LAP-APP-962657", quantity: 2 }, { sku: "LAP-HP-172551", quantity: 1 }]) },
      { id: "po-2", poNumber: "PO-2026-002", customerId: "u-customer", customerName: "Premium Customer", dateReceived: new Date("2026-07-03"), totalItems: 5, stockStatus: "Available", verificationStatus: "PO Verified & Stock Available", branchCode: "BLR", itemsJson: JSON.stringify([{ sku: "PHN-GGL-844973", quantity: 5 }]) },
      { id: "po-3", poNumber: "PO-2026-003", customerId: "u-customer", customerName: "Premium Customer", dateReceived: new Date("2026-07-05"), totalItems: 10, stockStatus: "Shortage", verificationStatus: "Pending", branchCode: "CHN", itemsJson: JSON.stringify([{ sku: "LAP-HP-172551", quantity: 10 }]) }
    ],
  };
}

const mockStore = globalForMockDb.mockDb;

const isDatabaseConnected = () => {
  return !!process.env.DATABASE_URL;
};

const mapDbUser = (user: any) => {
  if (!user) return null;
  return {
    ...user,
    branch: user.branchName || (typeof user.branch === "string" ? user.branch : user.branch?.name) || "Head Office",
    status: user.status || (user.isActive ? "ACTIVE" : "PENDING"),
    assignedEmployeeId: user.assignedEmployeeId || null
  };
};

const mockFindMany = (key: keyof MockDbState, args?: any) => {
  let items = mockStore[key] || [];
  if (args && args.where) {
    items = items.filter((x: any) => {
      return Object.entries(args.where).every(([k, v]) => {
        if (v && typeof v === "object") {
          if ("in" in v) {
            return (v.in as any[]).includes(x[k]);
          }
          if ("contains" in v) {
            const searchStr = String(v.contains).toLowerCase();
            const val = String(x[k] || "").toLowerCase();
            return val.includes(searchStr);
          }
        }
        return x[k] === v;
      });
    });
  }
  if (args && args.orderBy) {
    const sortKeys = Object.keys(args.orderBy);
    if (sortKeys.length > 0) {
      const field = sortKeys[0];
      const dir = args.orderBy[field];
      items = [...items].sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA < valB) return dir === "asc" ? -1 : 1;
        if (valA > valB) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
  }
  if (args && args.skip) {
    items = items.slice(args.skip);
  }
  if (args && args.take) {
    items = items.slice(0, args.take);
  }
  return items;
};

const makeProxy = (key: keyof MockDbState, prismaModel: any) => ({
  findMany: async (args?: any) => {
    if (isDatabaseConnected() && prismaModel) {
      return await prismaModel.findMany(args);
    }
    let items = mockStore[key] || [];
    
    // Support basic mock filters for offline compatibility
    if (args && args.where) {
      items = items.filter((x: any) => {
        return Object.entries(args.where).every(([k, v]) => {
          if (v && typeof v === "object" && "in" in v) {
            return (v.in as any[]).includes(x[k]);
          }
          return x[k] === v;
        });
      });
    }
    if (args && args.orderBy) {
      const sortKeys = Object.keys(args.orderBy);
      if (sortKeys.length > 0) {
        const field = sortKeys[0];
        const dir = args.orderBy[field];
        items = [...items].sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA < valB) return dir === "asc" ? -1 : 1;
          if (valA > valB) return dir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    if (args && args.take) {
      items = items.slice(0, args.take);
    }
    return items;
  },
  findUnique: async (args?: { where: Record<string, any> }) => {
    if (isDatabaseConnected() && prismaModel) {
      if (key === "chatSessions") {
        return await prismaModel.findUnique({
          where: args?.where,
          include: { messages: { orderBy: { timestamp: "asc" } } }
        });
      }
      return await prismaModel.findUnique({ where: args?.where });
    }
    if (!args || !args.where) return null;
    const found = mockStore[key]?.find((x: any) => {
      return Object.entries(args.where).every(([k, v]) => x[k] === v);
    }) || null;
    if (key === "chatSessions" && found) {
      return {
        ...found,
        messages: mockStore.chatMessages.filter(m => m.chatSessionId === found.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      };
    }
    return found;
  },
  create: async (args: { data: any }) => {
    if (isDatabaseConnected() && prismaModel) {
      return await prismaModel.create({ data: args.data });
    }
    const item = { id: `${key.substring(0, 3)}-${Date.now()}`, createdAt: new Date(), ...args.data };
    mockStore[key].push(item);
    return item;
  },
  update: async (args: { where: { id: string }; data: any }) => {
    if (isDatabaseConnected() && prismaModel) {
      return await prismaModel.update({ where: { id: args.where.id }, data: args.data });
    }
    const idx = mockStore[key].findIndex((x: any) => x.id === args.where.id);
    if (idx === -1) throw new Error(`${key} record not found`);
    mockStore[key][idx] = { ...mockStore[key][idx], ...args.data, updatedAt: new Date() };
    return mockStore[key][idx];
  },
  ...(key === "productPrices" ? {
    upsert: async (args: { where: { sku_branchCode: { sku: string; branchCode: string } }; update: any; create: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.productPrice.upsert({
          where: {
            sku_branchCode: {
              sku: args.where.sku_branchCode.sku,
              branchCode: args.where.sku_branchCode.branchCode
            }
          },
          update: args.update,
          create: args.create
        });
      }
      const { sku, branchCode } = args.where.sku_branchCode;
      const idx = mockStore.productPrices.findIndex(p => p.sku === sku && p.branchCode === branchCode);
      if (idx !== -1) {
        mockStore.productPrices[idx] = { ...mockStore.productPrices[idx], ...args.update, lastUpdated: new Date() };
        return mockStore.productPrices[idx];
      } else {
        const created = {
          id: `prc-${Date.now()}`,
          sku: args.create.sku,
          branchCode: args.create.branchCode,
          costPrice: Number(args.create.costPrice),
          sellingPrice: Number(args.create.sellingPrice),
          mrp: Number(args.create.mrp || 0.0),
          margin: Number(args.create.margin),
          lastUpdated: new Date()
        };
        mockStore.productPrices.push(created);
        return created;
      }
    }
  } : {})
});

export const erpDb = {
  isMock: () => !isDatabaseConnected(),

  users: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        const queryArgs = {
          ...args,
          include: args?.include || { role: true, branch: true }
        };
        const dbUsers = await prisma.user.findMany(queryArgs);
        return dbUsers.map(mapDbUser);
      }
      return mockFindMany("users", args).map(mapDbUser);
    },
    findUnique: async (args: { where: { id?: string; email?: string } }) => {
      if (isDatabaseConnected()) {
        const dbUser = await prisma.user.findUnique({
          where: args.where as any,
          include: { role: true, branch: true }
        });
        return mapDbUser(dbUser);
      }
      if (args.where.id) return mockStore.users.find(u => u.id === args.where.id) || null;
      if (args.where.email) return mockStore.users.find(u => u.email === args.where.email) || null;
      return null;
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        const data = { ...args.data };
        if (data.branch && typeof data.branch === "string") {
          data.branchName = data.branch;
          const foundBranch = await prisma.branch.findFirst({ where: { name: { contains: data.branch, mode: 'insensitive' } } });
          if (foundBranch) {
            data.branchId = foundBranch.id;
          }
          delete data.branch;
        }
        if (data.status) {
          data.isActive = data.status === "ACTIVE";
        }
        const created = await prisma.user.create({ data, include: { role: true, branch: true } });
        return mapDbUser(created);
      }
      const u = { id: `u-${Date.now()}`, ...args.data, status: args.data.status || "PENDING" };
      mockStore.users.push(u);
      return u;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        const data = { ...args.data };
        if (data.branch && typeof data.branch === "string") {
          data.branchName = data.branch;
          const foundBranch = await prisma.branch.findFirst({ where: { name: { contains: data.branch, mode: 'insensitive' } } });
          if (foundBranch) {
            data.branchId = foundBranch.id;
          }
          delete data.branch;
        }
        if (data.status) {
          data.isActive = data.status === "ACTIVE";
        }
        const updated = await prisma.user.update({
          where: { id: args.where.id },
          data,
          include: { role: true, branch: true }
        });
        return mapDbUser(updated);
      }
      const idx = mockStore.users.findIndex(u => u.id === args.where.id);
      if (idx === -1) throw new Error("User not found");
      mockStore.users[idx] = { ...mockStore.users[idx], ...args.data };
      return mockStore.users[idx];
    }
  },

  roles: {
    findMany: async () => {
      if (isDatabaseConnected()) return await prisma.role.findMany();
      return mockStore.roles;
    }
  },

  branches: {
    findMany: async () => {
      if (isDatabaseConnected()) {
        return await prisma.branch.findMany();
      }
      return mockStore.branches;
    }
  },

  categories: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) return await prisma.category.findMany(args);
      return mockFindMany("categories", args);
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) return await prisma.category.create({ data: args.data });
      const created = { id: `cat-${Date.now()}`, ...args.data };
      mockStore.categories.push(created);
      return created;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) return await prisma.category.update({ where: { id: args.where.id }, data: args.data });
      const idx = mockStore.categories.findIndex(c => c.id === args.where.id);
      if (idx === -1) throw new Error("Category not found");
      mockStore.categories[idx] = { ...mockStore.categories[idx], ...args.data };
      return mockStore.categories[idx];
    }
  },

  products: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        const queryArgs = {
          ...args,
          include: args?.include || { category: true }
        };
        return await prisma.product.findMany(queryArgs);
      }
      return mockFindMany("products", args).map(p => ({
        ...p,
        category: mockStore.categories.find(c => c.id === p.categoryId)
      }));
    },
    findUnique: async (args: { where: { id?: string; sku?: string } }) => {
      if (isDatabaseConnected()) {
        return await prisma.product.findUnique({
          where: args.where as any,
          include: { category: true }
        });
      }
      if (args.where.id) {
        const p = mockStore.products.find(x => x.id === args.where.id) || null;
        if (!p) return null;
        return { ...p, category: mockStore.categories.find(c => c.id === p.categoryId) };
      }
      if (args.where.sku) {
        const p = mockStore.products.find(x => x.sku === args.where.sku) || null;
        if (!p) return null;
        return { ...p, category: mockStore.categories.find(c => c.id === p.categoryId) };
      }
      return null;
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.product.create({ data: args.data, include: { category: true } });
      }
      const p = {
        id: `p-${Date.now()}`,
        sku: args.data.sku,
        name: args.data.name,
        categoryId: args.data.categoryId,
        brand: args.data.brand,
        serialTracking: args.data.serialTracking || false,
        barcode: args.data.barcode || `890${Math.floor(Math.random() * 100000000)}`,
        reorderLevel: Number(args.data.reorderLevel || 8),
        safetyStock: Number(args.data.safetyStock || 4),
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStore.products.push(p);
      return p;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.product.update({ where: { id: args.where.id }, data: args.data, include: { category: true } });
      }
      const idx = mockStore.products.findIndex(p => p.id === args.where.id);
      if (idx === -1) throw new Error("Product not found");
      mockStore.products[idx] = { ...mockStore.products[idx], ...args.data, updatedAt: new Date() };
      return mockStore.products[idx];
    }
  },

  inventory: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await prisma.inventory.findMany(args);
      }
      return mockFindMany("inventory", args);
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.inventory.create({ data: args.data });
      }
      const inv = { id: `inv-${Date.now()}`, ...args.data };
      mockStore.inventory.push(inv);
      return inv;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.inventory.update({ where: { id: args.where.id }, data: args.data });
      }
      const idx = mockStore.inventory.findIndex(i => i.id === args.where.id);
      if (idx === -1) throw new Error("Inventory record not found");
      mockStore.inventory[idx] = { ...mockStore.inventory[idx], ...args.data };
      return mockStore.inventory[idx];
    }
  },

  chatSessions: {
    findMany: async (args?: { where?: { userId: string } }) => {
      if (isDatabaseConnected()) {
        return await prisma.chatSession.findMany({
          where: args?.where,
          orderBy: { createdAt: "desc" }
        });
      }
      if (args && args.where && args.where.userId) {
        const uid = args.where.userId;
        return mockStore.chatSessions.filter(s => s.userId === uid).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      return mockStore.chatSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await prisma.chatSession.findUnique({
          where: { id: args.where.id },
          include: { messages: { orderBy: { timestamp: "asc" } } }
        });
      }
      const s = mockStore.chatSessions.find(x => x.id === args.where.id);
      if (!s) return null;
      return {
        ...s,
        messages: mockStore.chatMessages.filter(m => m.chatSessionId === s.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      };
    },
    create: async (args: { data: { userId: string; title: string } }) => {
      if (isDatabaseConnected()) {
        return await prisma.chatSession.create({ data: args.data });
      }
      const s = { id: `sess-${Date.now()}`, userId: args.data.userId, title: args.data.title, createdAt: new Date() };
      mockStore.chatSessions.push(s);
      return s;
    }
  },

  stockReservations: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservation.findMany({
          ...args,
          include: { user: true, product: true }
        });
      }
      return mockFindMany("stockReservations", args).map(res => ({
        ...res,
        user: mockStore.users.find(u => u.id === res.customerId),
        product: mockStore.products.find(p => p.id === res.productId)
      }));
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservation.findUnique({
          where: { id: args.where.id },
          include: { user: true, product: true }
        });
      }
      const res = mockStore.stockReservations.find(x => x.id === args.where.id);
      if (!res) return null;
      return {
        ...res,
        user: mockStore.users.find(u => u.id === res.customerId),
        product: mockStore.products.find(p => p.id === res.productId)
      };
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservation.create({
          data: args.data,
          include: { user: true, product: true }
        });
      }
      const item = { id: `res-${Date.now()}`, createdAt: new Date(), ...args.data };
      mockStore.stockReservations.push(item);
      return {
        ...item,
        user: mockStore.users.find(u => u.id === item.customerId),
        product: mockStore.products.find(p => p.id === item.productId)
      };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservation.update({
          where: { id: args.where.id },
          data: args.data,
          include: { user: true, product: true }
        });
      }
      const idx = mockStore.stockReservations.findIndex(x => x.id === args.where.id);
      if (idx === -1) throw new Error("StockReservation not found");
      mockStore.stockReservations[idx] = { ...mockStore.stockReservations[idx], ...args.data, updatedAt: new Date() };
      const item = mockStore.stockReservations[idx];
      return {
        ...item,
        user: mockStore.users.find(u => u.id === item.customerId),
        product: mockStore.products.find(p => p.id === item.productId)
      };
    }
  },

  notifications: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await prisma.notification.findMany({
          ...args,
          orderBy: args?.orderBy || { createdAt: "desc" }
        });
      }
      return mockFindMany("notifications", args);
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.notification.create({ data: args.data });
      }
      const item = { id: `noti-${Date.now()}`, createdAt: new Date(), read: false, ...args.data };
      mockStore.notifications.push(item);
      return item;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.notification.update({ where: { id: args.where.id }, data: args.data });
      }
      const idx = mockStore.notifications.findIndex((x: any) => x.id === args.where.id);
      if (idx === -1) throw new Error("Notification not found");
      mockStore.notifications[idx] = { ...mockStore.notifications[idx], ...args.data };
      return mockStore.notifications[idx];
    }
  },
  purchaseOrders: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await prisma.purchaseOrder.findMany(args);
      }
      return mockFindMany("purchaseOrders", args);
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await prisma.purchaseOrder.findUnique({ where: { id: args.where.id } });
      }
      const found = mockStore.purchaseOrders.find(po => po.id === args.where.id) || null;
      return found;
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.purchaseOrder.create({ data: args.data });
      }
      const item = { id: `po-${Date.now()}`, dateReceived: new Date(), ...args.data };
      mockStore.purchaseOrders.push(item);
      return item;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.purchaseOrder.update({ where: { id: args.where.id }, data: args.data });
      }
      const idx = mockStore.purchaseOrders.findIndex(x => x.id === args.where.id);
      if (idx === -1) throw new Error("PurchaseOrder not found");
      mockStore.purchaseOrders[idx] = { ...mockStore.purchaseOrders[idx], ...args.data };
      return mockStore.purchaseOrders[idx];
    }
  },
  roles_raw: makeProxy("roles", prisma.role),
  categories_raw: makeProxy("categories", prisma.category),
  inventoryMovements: makeProxy("inventoryMovements", prisma.inventoryMovement),
  stockAlerts: makeProxy("stockAlerts", prisma.stockAlert),
  productPrices: makeProxy("productPrices", prisma.productPrice),
  productPriceHistory: makeProxy("productPriceHistory", prisma.productPriceHistory),
  chatMessages: makeProxy("chatMessages", prisma.chatMessage),
  aiQueryLogs: makeProxy("aiQueryLogs", prisma.aIQueryLog),
  aiAuditLogs: makeProxy("aiAuditLogs", prisma.aIAuditLog)
};
