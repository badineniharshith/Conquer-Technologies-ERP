import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/stock-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const branch = searchParams.get("branch") || "ALL";
    const category = searchParams.get("category") || "ALL";
    const status = searchParams.get("status") || "ALL"; // 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (branch !== "ALL") {
      conditions.push(`inv.branch_code = $${idx++}`);
      values.push(branch);
    }

    if (category !== "ALL") {
      conditions.push(`(c.name = $${idx} OR c.id = $${idx})`);
      values.push(category);
      idx++;
    }

    if (q) {
      conditions.push(`(
        inv.sku ILIKE $${idx} OR
        inv.item_name ILIKE $${idx} OR
        p.name ILIKE $${idx}
      )`);
      values.push(`%${q}%`);
      idx++;
    }

    if (status === "IN_STOCK") {
      conditions.push(`(inv.quantity - inv.reserved_qty) > 0`);
    } else if (status === "LOW_STOCK") {
      conditions.push(`(inv.quantity - inv.reserved_qty) > 0 AND (inv.quantity - inv.reserved_qty) <= COALESCE(p.reorder_level, 10)`);
    } else if (status === "OUT_OF_STOCK") {
      conditions.push(`(inv.quantity - inv.reserved_qty) <= 0`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await pgPool.query(
      `SELECT COUNT(*) as total
       FROM public.inventories inv
       LEFT JOIN public.products p ON p.sku = inv.sku
       LEFT JOIN public.categories c ON c.id = p.category_id
       ${whereSql};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || "0");

    const dataRes = await pgPool.query(
      `SELECT 
         inv.id,
         inv.sku,
         COALESCE(p.name, inv.item_name, inv.sku) as product_name,
         p.brand,
         COALESCE(c.name, 'General') as category_name,
         inv.branch_code,
         inv.quantity as physical_stock,
         inv.reserved_qty as reserved_stock,
         GREATEST(0, inv.quantity - inv.reserved_qty) as available_stock,
         COALESCE(p.reorder_level, inv.reorder_level, 10) as reorder_level,
         CASE 
           WHEN (inv.quantity - inv.reserved_qty) <= 0 THEN 'OUT_OF_STOCK'
           WHEN (inv.quantity - inv.reserved_qty) <= COALESCE(p.reorder_level, 10) THEN 'LOW_STOCK'
           ELSE 'IN_STOCK'
         END as stock_status,
         inv.updated_at
       FROM public.inventories inv
       LEFT JOIN public.products p ON p.sku = inv.sku
       LEFT JOIN public.categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY inv.updated_at DESC, inv.sku ASC
       LIMIT $${idx++} OFFSET $${idx++};`,
      [...values, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
