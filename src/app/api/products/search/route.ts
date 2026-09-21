import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/stock-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const branchCode = (searchParams.get("branch") || "HYD-HQ").trim();
    const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "15")));

    let sql: string;
    let values: any[];

    if (!q) {
      sql = `
        SELECT 
          p.id, p.sku, p.name, p.brand,
          COALESCE(inv.quantity, 0) as physical_stock,
          COALESCE(inv.reserved_qty, 0) as reserved_stock,
          GREATEST(0, COALESCE(inv.quantity, 0) - COALESCE(inv.reserved_qty, 0)) as available_stock
        FROM public.products p
        LEFT JOIN public.inventories inv ON inv.sku = p.sku AND (inv.branch_code = $1 OR inv.branch_id = $1)
        ORDER BY p.name ASC
        LIMIT $2;
      `;
      values = [branchCode, limit];
    } else {
      sql = `
        SELECT 
          p.id, p.sku, p.name, p.brand,
          COALESCE(inv.quantity, 0) as physical_stock,
          COALESCE(inv.reserved_qty, 0) as reserved_stock,
          GREATEST(0, COALESCE(inv.quantity, 0) - COALESCE(inv.reserved_qty, 0)) as available_stock
        FROM public.products p
        LEFT JOIN public.inventories inv ON inv.sku = p.sku AND (inv.branch_code = $1 OR inv.branch_id = $1)
        WHERE p.sku ILIKE $2 OR p.name ILIKE $2
        ORDER BY 
          CASE WHEN p.sku ILIKE $3 THEN 1 WHEN p.sku ILIKE $2 THEN 2 ELSE 3 END,
          p.name ASC
        LIMIT $4;
      `;
      values = [branchCode, `%${q}%`, `${q}%`, limit];
    }

    const res = await pgPool.query(sql, values);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
