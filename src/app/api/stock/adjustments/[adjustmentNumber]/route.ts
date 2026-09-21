import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/stock-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ adjustmentNumber: string }> | { adjustmentNumber: string } }
) {
  try {
    const resolvedParams = await params;
    const { adjustmentNumber } = resolvedParams;

    const adjRes = await pgPool.query(
      `SELECT 
         sa.*,
         COALESCE(p.name, sa.sku) as product_name
       FROM public.stock_adjustments sa
       LEFT JOIN public.products p ON p.sku = sa.sku
       WHERE sa.adjustment_number = $1 OR sa.id = $1
       LIMIT 1;`,
      [adjustmentNumber]
    );

    if (adjRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Adjustment ${adjustmentNumber} not found.` },
        { status: 404 }
      );
    }

    const adjustment = adjRes.rows[0];

    // Query allocations linked to this adjustment
    const allocRes = await pgPool.query(
      `SELECT 
         posa.*,
         po.po_number,
         po.customer_name
       FROM public.purchase_order_stock_allocations posa
       JOIN public.purchase_orders po ON po.id = posa.purchase_order_id
       WHERE posa.adjustment_id = $1 OR posa.adjustment_number = $2;`,
      [adjustment.id, adjustment.adjustment_number]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...adjustment,
        allocations: allocRes.rows,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
