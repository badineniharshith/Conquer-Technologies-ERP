import { NextRequest, NextResponse } from "next/server";
import { executeStockAdjustment, pgPool } from "@/lib/stock-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "ALL";
    const branch = searchParams.get("branch") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (type !== "ALL") {
      conditions.push(`sa.adjustment_type = $${idx++}`);
      values.push(type);
    }

    if (branch !== "ALL") {
      conditions.push(`sa.branch_code = $${idx++}`);
      values.push(branch);
    }

    if (q.trim()) {
      conditions.push(`(
        sa.sku ILIKE $${idx} OR 
        sa.adjustment_number ILIKE $${idx} OR 
        sa.reason ILIKE $${idx} OR 
        sa.created_by ILIKE $${idx} OR
        p.name ILIKE $${idx}
      )`);
      values.push(`%${q.trim()}%`);
      idx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await pgPool.query(
      `SELECT COUNT(*) as total 
       FROM public.stock_adjustments sa
       LEFT JOIN public.products p ON p.sku = sa.sku
       ${whereSql};`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total || "0");

    const dataRes = await pgPool.query(
      `SELECT 
         sa.id,
         sa.adjustment_number,
         sa.sku,
         COALESCE(p.name, sa.sku) as product_name,
         sa.branch_code,
         sa.adjustment_type,
         sa.quantity,
         sa.previous_quantity,
         sa.new_quantity,
         sa.reason,
         sa.notes,
         sa.reference_type,
         sa.reference_id,
         sa.created_by,
         sa.created_at
       FROM public.stock_adjustments sa
       LEFT JOIN public.products p ON p.sku = sa.sku
       ${whereSql}
       ORDER BY sa.created_at DESC
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, branchCode, quantity, type, reason, notes, user, targetPoId } = body;

    if (!sku || !branchCode || !quantity || !type || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: sku, branchCode, quantity, type, reason.",
        },
        { status: 400 }
      );
    }

    const result = await executeStockAdjustment(
      {
        sku,
        branchCode,
        quantity: Number(quantity),
        type,
        reason,
        notes,
        targetPoId: targetPoId || null,
      },
      {
        name: user?.name || "Operations Executive",
        email: user?.email || "operations@conquererp.com",
      }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process stock adjustment." },
      { status: 400 }
    );
  }
}
