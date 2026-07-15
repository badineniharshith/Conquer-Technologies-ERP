import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

// Direct accessor to mock database store
const getMockDb = () => {
  return (global as any).mockDb;
};

const TABLE_MAPPING: Record<string, string> = {
  users: "Users",
  roles: "Roles",
  regions: "Regions",
  branches: "Branches",
  categories: "Categories",
  products: "Products",
  inventory: "Inventory Records",
  inventory_movements: "Inventory Movements",
  product_prices: "Product Prices",
  product_price_history: "Product Price History",
  stock_alerts: "Stock Alerts",
  transfer_requests: "Transfer Requests",
  transfer_items: "Transfer Items",
  chat_sessions: "AI Chat Sessions",
  chat_messages: "AI Chat Messages",
  ai_query_logs: "AI NLP Query Logs",
  ai_audit_logs: "AI NLP Security Logs"
};

const SNAKE_TO_CAMEL: Record<string, string> = {
  users: "users",
  roles: "roles",
  regions: "regions",
  branches: "branches",
  categories: "categories",
  products: "products",
  inventory: "inventory",
  inventory_movements: "inventoryMovements",
  product_prices: "productPrices",
  product_price_history: "productPriceHistory",
  stock_alerts: "stockAlerts",
  transfer_requests: "transferRequests",
  transfer_items: "transferItems"
};

const CAMEL_TO_PRISMA_MODEL: Record<string, string> = {
  users: "user",
  roles: "role",
  regions: "region",
  branches: "branch",
  categories: "category",
  products: "product",
  inventory: "inventory",
  inventoryMovements: "inventoryMovement",
  productPrices: "productPrice",
  productPriceHistory: "productPriceHistory",
  stockAlerts: "stockAlert",
  transferRequests: "transferRequest",
  transferItem: "transferItem"
};

export async function GET(req: NextRequest) {
  try {
    // 1. Session Verification
    const tokenCookie = req.cookies.get("erp-session-token");
    const token = tokenCookie?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const sessionPayload = await verifyJwt(token);
    if (!sessionPayload || !["SUPER_ADMIN", "ADMIN"].includes(sessionPayload.role)) {
      return NextResponse.json({ error: "Access Denied: Requires Admin Privileges" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table"); // e.g. "inventory_movements"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const mockDb = getMockDb();
    const isDb = !!process.env.DATABASE_URL;

    // 2. Return Table Metadata list if no specific table requested
    if (!table) {
      const metadataList = [];
      for (const key of Object.keys(TABLE_MAPPING)) {
        const camelKey = SNAKE_TO_CAMEL[key];
        let count = 0;
        if (isDb) {
          const modelName = CAMEL_TO_PRISMA_MODEL[camelKey];
          const prismaClientInstance = (await import("@/lib/db")).prisma;
          if (modelName && (prismaClientInstance as any)[modelName]) {
            count = await (prismaClientInstance as any)[modelName].count();
          }
        } else {
          const dataArray = mockDb ? mockDb[camelKey] || [] : [];
          count = dataArray.length;
        }
        metadataList.push({
          id: key,
          displayName: TABLE_MAPPING[key],
          recordsCount: count
        });
      }

      return NextResponse.json({ tables: metadataList });
    }

    // 3. Return Paginated Table rows
    if (!TABLE_MAPPING[table]) {
      return NextResponse.json({ error: "Invalid Table Name requested" }, { status: 400 });
    }

    const camelTableKey = SNAKE_TO_CAMEL[table];
    let records = [];
    if (isDb) {
      const modelName = CAMEL_TO_PRISMA_MODEL[camelTableKey];
      const prismaClientInstance = (await import("@/lib/db")).prisma;
      if (modelName && (prismaClientInstance as any)[modelName]) {
        records = await (prismaClientInstance as any)[modelName].findMany();
      }
    } else {
      records = mockDb ? mockDb[camelTableKey] || [] : [];
    }
    
    const totalRecords = records.length;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = records.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      tableName: TABLE_MAPPING[table],
      rows: paginatedRecords,
      totalCount: totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      limit
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
