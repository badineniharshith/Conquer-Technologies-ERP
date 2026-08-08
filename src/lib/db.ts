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
  stockReservations: any[];
  stockReservationItems: any[];
  notifications: any[];
  purchaseOrders: any[];
  opportunities: any[];
  vendors: any[];
  poItems: any[];
  profileUpdateRequests: any[];
}

const hashPassword = (plain: string) => bcrypt.hashSync(plain, 10);

const initialRoles = [
  { id: "SUPER_ADMIN", name: "SUPER_ADMIN" },
  { id: "ADMIN", name: "ADMIN" },
  { id: "EMPLOYEE", name: "EMPLOYEE" },
  { id: "CUSTOMER", name: "CUSTOMER" }
];

const initialUsers = [
  { id: "u-superadmin", name: "Corporate Super Admin", email: "superadmin@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "SUPER_ADMIN", branch: "Head Office", status: "ACTIVE" },
  { id: "u-admin", name: "System Admin", email: "admin@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "ADMIN", branch: "Head Office", status: "ACTIVE" },
  { id: "u-saleshead", name: "Global Sales Head", email: "saleshead@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "EMPLOYEE", branch: "Head Office", status: "ACTIVE" },
  { id: "u-rsm-south", name: "Regional Manager South", email: "rsm.south@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "EMPLOYEE", branch: "Head Office", status: "ACTIVE" },
  { id: "u-bm-hyd", name: "Hyderabad Branch Manager", email: "bm.hyd@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-salesmgr", name: "Sales Manager HYD", email: "manager.hyd@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-exec-hyd", name: "Sales Executive HYD", email: "exec.hyd@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-employee-generic", name: "Company Employee", email: "employee@conquererp.com", passwordHash: hashPassword("Admin@123"), roleId: "EMPLOYEE", branch: "Hyderabad Corporate Office", status: "ACTIVE" },
  { id: "u-customer", name: "Premium Customer", email: "customer@gmail.com", passwordHash: hashPassword("Admin@123"), roleId: "CUSTOMER", branch: "None", status: "ACTIVE", assignedEmployeeId: "u-salesmgr" }
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
    stockReservations: [],
    stockReservationItems: [],
    notifications: [],
    purchaseOrders: [
      { id: "po-1", poNumber: "PO-2026-001", customerId: "u-customer", customerName: "Premium Customer", companyName: "Premium Corp", dateReceived: new Date("2026-07-01"), expectedDelivery: new Date("2026-07-15"), totalItems: 3, stockStatus: "Checking", verificationStatus: "Pending", verifiedBy: null, verifiedDate: null, branchCode: "HYD-HQ", itemsJson: JSON.stringify([{ sku: "LAP-APP-962657", quantity: 2 }, { sku: "LAP-HP-172551", quantity: 1 }]) },
      { id: "po-2", poNumber: "PO-2026-002", customerId: "u-customer", customerName: "Premium Customer", companyName: "Premium Corp", dateReceived: new Date("2026-07-03"), expectedDelivery: new Date("2026-07-17"), totalItems: 5, stockStatus: "Available", verificationStatus: "Verified", verifiedBy: "u-admin", verifiedDate: new Date("2026-07-04"), branchCode: "BLR", itemsJson: JSON.stringify([{ sku: "PHN-GGL-844973", quantity: 5 }]) },
      { id: "po-3", poNumber: "PO-2026-003", customerId: "u-customer", customerName: "Premium Customer", companyName: "Premium Corp", dateReceived: new Date("2026-07-05"), expectedDelivery: new Date("2026-07-20"), totalItems: 10, stockStatus: "Shortage", verificationStatus: "Pending", verifiedBy: null, verifiedDate: null, branchCode: "CHN", itemsJson: JSON.stringify([{ sku: "LAP-HP-172551", quantity: 10 }]) }
    ],
    opportunities: [],
    vendors: [
      { id: "v-001", name: "TechSource Distributors", contactPerson: "Rajesh Kumar", email: "rajesh@techsource.in", phone: "+91 98760 11111", address: "Plot 12, HITEC City, Hyderabad, Telangana 500081", gstNumber: "36AABCT1234Z1ZX", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() },
      { id: "v-002", name: "GlobalTech Supplies Pvt Ltd", contactPerson: "Priya Sharma", email: "priya@globaltech.in", phone: "+91 98760 22222", address: "B-42, Koramangala, Bengaluru, Karnataka 560034", gstNumber: "29AABCG5678Y2ZY", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() },
      { id: "v-003", name: "Apex Electronics Hub", contactPerson: "Mohammed Farhan", email: "farhan@apexhub.in", phone: "+91 98760 33333", address: "44/1 Anna Nagar, Chennai, Tamil Nadu 600040", gstNumber: "33AABCA9012Z3ZZ", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() },
      { id: "v-004", name: "MegaDistrib Solutions", contactPerson: "Sunita Patel", email: "sunita@megadistrib.in", phone: "+91 98760 44444", address: "Worli Sea Face, Mumbai, Maharashtra 400018", gstNumber: "27AABCM3456W4ZX", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() },
      { id: "v-005", name: "Prime Components India", contactPerson: "Arjun Reddy", email: "arjun@primecomponents.in", phone: "+91 98760 55555", address: "Road No. 2, Banjara Hills, Hyderabad, Telangana 500034", gstNumber: "36AABCP7890V5ZY", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }
    ],
    poItems: [],
    profileUpdateRequests: [],
  };
}

const mockStore = globalForMockDb.mockDb;

const isDatabaseConnected = () => {
  return !!process.env.DATABASE_URL;
};

const normalizePoRecord = (po: any) => {
  if (!po) return null;
  let itemsJson = po.itemsJson || po.items_json || "[]";
  if ((!itemsJson || itemsJson === "[]") && Array.isArray(po.poItems) && po.poItems.length > 0) {
    itemsJson = JSON.stringify(po.poItems.map((item: any) => ({
      sku: item.sku || item.productName || "N/A",
      name: item.productName || item.sku,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      total: Number(item.total || 0)
    })));
  }
  return {
    id: String(po.id),
    poNumber: po.poNumber || po.po_number || "PO-UNKNOWN",
    customerId: String(po.customerId || po.customer_id || ""),
    customerName: po.customerName || po.primaryContactName || po.primary_contact_name || po.customer_name || "Customer",
    companyName: po.companyName || po.company_name || "",
    vendorId: po.vendorId || po.vendor_id || null,
    totalAmount: po.totalAmount !== undefined ? Number(po.totalAmount) : (po.grandTotal !== undefined ? Number(po.grandTotal) : Number(po.total_amount || 0)),
    dateReceived: po.dateReceived || po.createdAt || po.created_at || po.date_received || new Date(),
    expectedDelivery: po.expectedDelivery || po.expected_delivery || null,
    totalItems: Number(po.totalItems || (Array.isArray(po.poItems) && po.poItems.length > 0 ? po.poItems.length : 1)),
    stockStatus: po.stockStatus || po.stock_status || "Checking",
    verificationStatus: po.verificationStatus || po.erpVerificationStatus || po.erp_verification_status || po.poStatus || po.po_status || "Pending",
    verifiedBy: po.verifiedBy || po.verified_by_id || null,
    verifiedDate: po.verifiedDate || po.verified_at || null,
    branchCode: po.branchCode || po.branch_code || "HYD-HQ",
    itemsJson: itemsJson,
    user: po.user || null,
    vendor: po.vendor || null,
    poItems: po.poItems || []
  };
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
      return await prismaModel.findUnique({ where: args?.where });
    }
    if (!args || !args.where) return null;
    const found = mockStore[key]?.find((x: any) => {
      return Object.entries(args.where).every(([k, v]) => x[k] === v);
    }) || null;
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
        return await (prisma as any).productPrice.upsert({
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
        try {
          const dbUsers = await prisma.user.findMany({
            ...args,
            include: { role: true, branch: true }
          });
          return dbUsers.map(mapDbUser);
        } catch (e) {
          // Fallback
        }
      }
      return mockFindMany("users", args).map(mapDbUser);
    },
    findUnique: async (args: { where: { id?: string; email?: string } }) => {
      if (isDatabaseConnected()) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: args.where as any,
            include: { role: true, branch: true }
          });
          if (dbUser) return mapDbUser(dbUser);
        } catch (e) {}
      }
      if (args.where.id) return mockStore.users.find(u => u.id === args.where.id) || null;
      if (args.where.email) return mockStore.users.find(u => u.email === args.where.email) || null;
      return null;
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        try {
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
        } catch (e) {}
      }
      const u = { id: `u-${Date.now()}`, ...args.data, status: args.data.status || "PENDING" };
      mockStore.users.push(u);
      return u;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        try {
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
        } catch (e) {}
      }
      const idx = mockStore.users.findIndex(u => u.id === args.where.id);
      if (idx === -1) throw new Error("User not found");
      mockStore.users[idx] = { ...mockStore.users[idx], ...args.data };
      return mockStore.users[idx];
    },
    delete: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        try {
          await prisma.stockReservation.deleteMany({
            where: { customerId: args.where.id }
          });
          await prisma.notification.deleteMany({
            where: { userId: args.where.id }
          });
          return await prisma.user.delete({
            where: { id: args.where.id }
          });
        } catch (e) {}
      }
      const idx = mockStore.users.findIndex(u => u.id === args.where.id);
      if (idx === -1) throw new Error("User not found");
      const deleted = mockStore.users[idx];
      mockStore.stockReservations = mockStore.stockReservations.filter((x: any) => x.customerId !== args.where.id);
      mockStore.notifications = mockStore.notifications.filter((x: any) => x.userId !== args.where.id);
      mockStore.purchaseOrders = mockStore.purchaseOrders.filter((x: any) => x.customerId !== args.where.id);
      mockStore.users.splice(idx, 1);
      return deleted;
    }
  },

  roles: {
    findMany: async () => {
      if (isDatabaseConnected()) {
        try {
          return await prisma.role.findMany({ orderBy: { name: "asc" } });
        } catch (e) {}
      }
      return mockStore.roles;
    }
  },

  branches: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await prisma.branch.findMany(args);
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
        const queryArgs = { ...args };
        if (!queryArgs.select && !queryArgs.include) {
          queryArgs.include = { category: true };
        }
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

  get inventories() {
    return this.inventory;
  },



  stockReservations: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await prisma.stockReservation.findMany({
          ...args,
          include: { customer: true, employee: true, product: true, items: { include: { product: true } } }
        });
      }
      return mockFindMany("stockReservations", args).map(res => ({
        ...res,
        user: mockStore.users.find(u => u.id === res.customerId),
        product: mockStore.products.find(p => p.id === res.productId),
        items: mockStore.stockReservationItems.filter(item => item.reservationId === res.id).map(item => ({
          ...item,
          product: mockStore.products.find(p => p.id === item.productId)
        }))
      }));
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await prisma.stockReservation.findUnique({
          where: { id: args.where.id },
          include: { customer: true, employee: true, product: true, items: { include: { product: true } } }
        });
      }
      const res = mockStore.stockReservations.find(x => x.id === args.where.id);
      if (!res) return null;
      return {
        ...res,
        user: mockStore.users.find(u => u.id === res.customerId),
        product: mockStore.products.find(p => p.id === res.productId),
        items: mockStore.stockReservationItems.filter(item => item.reservationId === res.id).map(item => ({
          ...item,
          product: mockStore.products.find(p => p.id === item.productId)
        }))
      };
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.stockReservation.create({
          data: args.data,
          include: { customer: true, employee: true, product: true, items: { include: { product: true } } }
        });
      }
      const item = { id: `res-${Date.now()}`, createdAt: new Date(), ...args.data };
      mockStore.stockReservations.push(item);
      return {
        ...item,
        user: mockStore.users.find(u => u.id === item.customerId),
        product: mockStore.products.find(p => p.id === item.productId),
        items: mockStore.stockReservationItems.filter(x => x.reservationId === item.id).map(x => ({
          ...x,
          product: mockStore.products.find(p => p.id === x.productId)
        }))
      };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await prisma.stockReservation.update({
          where: { id: args.where.id },
          data: args.data,
          include: { customer: true, employee: true, product: true, items: { include: { product: true } } }
        });
      }
      const idx = mockStore.stockReservations.findIndex(x => x.id === args.where.id);
      if (idx === -1) throw new Error("StockReservation not found");
      mockStore.stockReservations[idx] = { ...mockStore.stockReservations[idx], ...args.data, updatedAt: new Date() };
      const item = mockStore.stockReservations[idx];
      return {
        ...item,
        user: mockStore.users.find(u => u.id === item.customerId),
        product: mockStore.products.find(p => p.id === item.productId),
        items: mockStore.stockReservationItems.filter(x => x.reservationId === item.id).map(x => ({
          ...x,
          product: mockStore.products.find(p => p.id === x.productId)
        }))
      };
    }
  },

  stockReservationItems: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.findMany(args);
      }
      return mockFindMany("stockReservationItems", args).map(item => ({
        ...item,
        product: mockStore.products.find(p => p.id === item.productId)
      }));
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.findUnique(args);
      }
      const item = mockStore.stockReservationItems.find(x => x.id === args.where.id);
      if (!item) return null;
      return {
        ...item,
        product: mockStore.products.find(p => p.id === item.productId)
      };
    },
    findFirst: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.findFirst(args);
      }
      const list = mockFindMany("stockReservationItems", args);
      if (list.length === 0) return null;
      const item = list[0];
      return {
        ...item,
        product: mockStore.products.find(p => p.id === item.productId)
      };
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.create(args);
      }
      const item = { id: `resitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`, createdAt: new Date(), ...args.data };
      mockStore.stockReservationItems.push(item);
      return {
        ...item,
        product: mockStore.products.find(p => p.id === item.productId)
      };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.update(args);
      }
      const idx = mockStore.stockReservationItems.findIndex(x => x.id === args.where.id);
      if (idx === -1) throw new Error("StockReservationItem not found");
      mockStore.stockReservationItems[idx] = { ...mockStore.stockReservationItems[idx], ...args.data, updatedAt: new Date() };
      const item = mockStore.stockReservationItems[idx];
      return {
        ...item,
        product: mockStore.products.find(p => p.id === item.productId)
      };
    },
    delete: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.delete(args);
      }
      const idx = mockStore.stockReservationItems.findIndex(x => x.id === args.where.id);
      if (idx === -1) throw new Error("StockReservationItem not found");
      const item = mockStore.stockReservationItems[idx];
      mockStore.stockReservationItems.splice(idx, 1);
      return item;
    },
    deleteMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).stockReservationItem.deleteMany(args);
      }
      if (args?.where?.reservationId) {
        mockStore.stockReservationItems = mockStore.stockReservationItems.filter(x => x.reservationId !== args.where.reservationId);
      } else if (args?.where?.id) {
        mockStore.stockReservationItems = mockStore.stockReservationItems.filter(x => x.id !== args.where.id);
      } else {
        mockStore.stockReservationItems = [];
      }
      return { count: mockStore.stockReservationItems.length };
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
        try {
          const queryArgs: any = { ...args };
          if (!queryArgs.select && !queryArgs.include) {
            queryArgs.include = {
              customer: true,
              vendor: true,
              poItems: true,
              attachments: true,
              statusHistory: true
            };
          }
          if (!queryArgs.orderBy) {
            queryArgs.orderBy = { createdAt: "desc" };
          }
          const dbPos = await prisma.purchaseOrder.findMany(queryArgs);
          return dbPos.map(normalizePoRecord);
        } catch (e) {
          console.error("prisma.purchaseOrder.findMany error:", e);
        }
      }
      let items = mockFindMany("purchaseOrders", args);
      return items.map((po: any) => ({
        ...normalizePoRecord(po),
        user: mockStore.users.find(u => u.id === po.customerId)
      }));
    },
    findUnique: async (args: { where: { id?: string | number; poNumber?: string } }) => {
      if (isDatabaseConnected()) {
        try {
          const whereClause: any = {};
          if (args.where.id) whereClause.id = String(args.where.id);
          if (args.where.poNumber) whereClause.poNumber = args.where.poNumber;

          const dbPo = await prisma.purchaseOrder.findFirst({
            where: whereClause,
            include: {
              customer: true,
              vendor: true,
              poItems: true,
              attachments: true,
              statusHistory: true
            }
          });
          if (dbPo) return normalizePoRecord(dbPo);
        } catch (e) {}
      }
      if (args.where.id) {
        const found = mockStore.purchaseOrders.find(po => String(po.id) === String(args.where.id)) || null;
        if (!found) return null;
        return normalizePoRecord({ ...found, user: mockStore.users.find(u => u.id === found.customerId) });
      }
      if (args.where.poNumber) {
        const found = mockStore.purchaseOrders.find(po => po.poNumber === args.where.poNumber) || null;
        if (!found) return null;
        return normalizePoRecord({ ...found, user: mockStore.users.find(u => u.id === found.customerId) });
      }
      return null;
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        try {
          const created = await prisma.purchaseOrder.create({
            data: args.data,
            include: { customer: true, vendor: true, poItems: true }
          });
          return normalizePoRecord(created);
        } catch (e) {}
      }
      const item = { id: `po-${Date.now()}`, dateReceived: new Date(), companyName: "", verifiedBy: null, verifiedDate: null, ...args.data };
      mockStore.purchaseOrders.push(item);
      return normalizePoRecord({ ...item, user: mockStore.users.find(u => u.id === item.customerId) });
    },
    update: async (args: { where: { id: string | number }; data: any }) => {
      if (isDatabaseConnected()) {
        try {
          const poId = String(args.where.id);
          const updated = await prisma.purchaseOrder.update({
            where: { id: poId },
            data: args.data,
            include: { customer: true, vendor: true, poItems: true }
          });
          return normalizePoRecord(updated);
        } catch (e) {}
      }
      const idx = mockStore.purchaseOrders.findIndex(x => String(x.id) === String(args.where.id));
      if (idx !== -1) {
        mockStore.purchaseOrders[idx] = { ...mockStore.purchaseOrders[idx], ...args.data };
        const po = mockStore.purchaseOrders[idx];
        return normalizePoRecord({ ...po, user: mockStore.users.find(u => u.id === po.customerId) });
      }
      return null;
    }
  },

  opportunities: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).opportunity.findMany({
          ...args,
          include: { user: true, purchaseOrder: true, ...(args?.include || {}) }
        });
      }
      return mockFindMany("opportunities", args).map((opp: any) => ({
        ...opp,
        user: mockStore.users.find(u => u.id === opp.customerId),
        purchaseOrder: mockStore.purchaseOrders.find(po => po.id === opp.purchaseOrderId)
      }));
    },
    findUnique: async (args: { where: { id?: string; purchaseOrderId?: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).opportunity.findUnique({
          where: args.where as any,
          include: { user: true, purchaseOrder: true }
        });
      }
      let found: any = null;
      if (args.where.id) found = mockStore.opportunities.find(o => o.id === args.where.id) || null;
      if (args.where.purchaseOrderId) found = mockStore.opportunities.find(o => o.purchaseOrderId === args.where.purchaseOrderId) || null;
      if (!found) return null;
      return {
        ...found,
        user: mockStore.users.find(u => u.id === found.customerId),
        purchaseOrder: mockStore.purchaseOrders.find(po => po.id === found.purchaseOrderId)
      };
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).opportunity.create({ data: args.data, include: { user: true, purchaseOrder: true } });
      }
      const item = { id: `opp-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), ...args.data };
      mockStore.opportunities.push(item);
      return {
        ...item,
        user: mockStore.users.find(u => u.id === item.customerId),
        purchaseOrder: mockStore.purchaseOrders.find(po => po.id === item.purchaseOrderId)
      };
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).opportunity.update({ where: { id: args.where.id }, data: args.data, include: { user: true, purchaseOrder: true } });
      }
      const idx = mockStore.opportunities.findIndex(o => o.id === args.where.id);
      if (idx === -1) throw new Error("Opportunity not found");
      mockStore.opportunities[idx] = { ...mockStore.opportunities[idx], ...args.data, updatedAt: new Date() };
      const opp = mockStore.opportunities[idx];
      return {
        ...opp,
        user: mockStore.users.find(u => u.id === opp.customerId),
        purchaseOrder: mockStore.purchaseOrders.find(po => po.id === opp.purchaseOrderId)
      };
    }
  },

  roles_raw: makeProxy("roles", (prisma as any).role),
  categories_raw: makeProxy("categories", (prisma as any).category),
  inventoryMovements: makeProxy("inventoryMovements", (prisma as any).inventoryMovement),
  stockAlerts: makeProxy("stockAlerts", (prisma as any).stockAlert),
  productPrices: makeProxy("productPrices", (prisma as any).productPrice),
  productPriceHistory: makeProxy("productPriceHistory", (prisma as any).productPriceHistory),

  vendors: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).vendor.findMany(args);
      }
      return mockFindMany("vendors", args);
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).vendor.findUnique({ where: args.where });
      }
      return mockStore.vendors.find(v => v.id === args.where.id) || null;
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).vendor.create({ data: args.data });
      }
      const item = { createdAt: new Date(), updatedAt: new Date(), ...args.data };
      mockStore.vendors.push(item);
      return item;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).vendor.update({ where: { id: args.where.id }, data: args.data });
      }
      const idx = mockStore.vendors.findIndex(v => v.id === args.where.id);
      if (idx === -1) throw new Error("Vendor not found");
      mockStore.vendors[idx] = { ...mockStore.vendors[idx], ...args.data, updatedAt: new Date() };
      return mockStore.vendors[idx];
    }
  },

  poItems: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).poItem.findMany(args);
      }
      return mockFindMany("poItems", args);
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).poItem.findUnique({ where: args.where });
      }
      return mockStore.poItems.find(p => p.id === args.where.id) || null;
    },
    createMany: async (args: { data: any[] }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).poItem.createMany({ data: args.data });
      }
      const items = args.data.map(d => ({ id: `poi-${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date(), updatedAt: new Date(), ...d }));
      mockStore.poItems.push(...items);
      return { count: items.length };
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).poItem.create({ data: args.data });
      }
      const item = { id: `poi-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), ...args.data };
      mockStore.poItems.push(item);
      return item;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).poItem.update({ where: { id: args.where.id }, data: args.data });
      }
      const idx = mockStore.poItems.findIndex(p => p.id === args.where.id);
      if (idx === -1) throw new Error("PoItem not found");
      mockStore.poItems[idx] = { ...mockStore.poItems[idx], ...args.data, updatedAt: new Date() };
      return mockStore.poItems[idx];
    },
    updateMany: async (args: { where: any; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).poItem.updateMany({ where: args.where, data: args.data });
      }
      let count = 0;
      mockStore.poItems = mockStore.poItems.map(p => {
        const matches = Object.entries(args.where).every(([k, v]) => p[k] === v);
        if (matches) { count++; return { ...p, ...args.data, updatedAt: new Date() }; }
        return p;
      });
      return { count };
    },
    deleteMany: async (args: { where: any }) => {
      const before = mockStore.poItems.length;
      mockStore.poItems = mockStore.poItems.filter(p => {
        return !Object.entries(args.where).every(([k, v]) => p[k] === v);
      });
      return { count: before - mockStore.poItems.length };
    }
  },

  profileUpdateRequests: {
    findMany: async (args?: any) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).profileUpdateRequest.findMany({
          ...args,
          include: { user: true, ...(args?.include || {}) }
        });
      }
      return mockFindMany("profileUpdateRequests", args).map((req: any) => ({
        ...req,
        user: mockStore.users.find(u => u.id === req.userId)
      }));
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).profileUpdateRequest.findUnique({
          where: args.where,
          include: { user: true }
        });
      }
      const found = mockStore.profileUpdateRequests.find(r => r.id === args.where.id);
      if (!found) return null;
      return { ...found, user: mockStore.users.find(u => u.id === found.userId) };
    },
    create: async (args: { data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).profileUpdateRequest.create({ data: args.data });
      }
      const item = { id: `pur-${Date.now()}`, createdAt: new Date(), updatedAt: new Date(), status: "PENDING", ...args.data };
      mockStore.profileUpdateRequests.push(item);
      return item;
    },
    update: async (args: { where: { id: string }; data: any }) => {
      if (isDatabaseConnected()) {
        return await (prisma as any).profileUpdateRequest.update({ where: args.where, data: args.data });
      }
      const idx = mockStore.profileUpdateRequests.findIndex(r => r.id === args.where.id);
      if (idx === -1) throw new Error("ProfileUpdateRequest not found");
      mockStore.profileUpdateRequests[idx] = { ...mockStore.profileUpdateRequests[idx], ...args.data, updatedAt: new Date() };
      return mockStore.profileUpdateRequests[idx];
    }
  }
};
