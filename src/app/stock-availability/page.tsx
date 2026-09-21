import { prisma } from "@/lib/db";
import { pgPool } from "@/lib/stock-service";
import { serializeData } from "@/lib/serialize";
import StockAvailabilityClient from "@/components/inventory/StockAvailabilityClient";

export const dynamic = "force-dynamic";

export default async function StockAvailabilityPage() {
  const [invRes, categories, branches] = await Promise.all([
    pgPool.query(`
      SELECT 
        inv.id,
        inv.sku,
        COALESCE(p.name, inv.item_name, inv.sku) as product_name,
        p.brand,
        COALESCE(c.name, 'General') as category_name,
        inv.branch_code,
        inv.quantity as physical_stock,
        COALESCE(inv.allocated_qty, 0) as allocated_stock,
        COALESCE(inv.reserved_qty, 0) as reserved_stock,
        GREATEST(0, inv.quantity - COALESCE(inv.allocated_qty, 0) - COALESCE(inv.reserved_qty, 0)) as available_stock,
        COALESCE(pending_po.pending_qty, 0) as pending_po_qty,
        COALESCE(p.reorder_level, inv.reorder_level, 10) as reorder_level,
        CASE 
          WHEN (inv.quantity - COALESCE(inv.allocated_qty, 0) - COALESCE(inv.reserved_qty, 0)) <= 0 THEN 'OUT_OF_STOCK'
          WHEN (inv.quantity - COALESCE(inv.allocated_qty, 0) - COALESCE(inv.reserved_qty, 0)) <= COALESCE(p.reorder_level, 10) THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status,
        inv.updated_at
      FROM public.inventories inv
      LEFT JOIN public.products p ON p.sku = inv.sku
      LEFT JOIN public.categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT 
          poi.sku,
          SUM(COALESCE(poi.remaining_quantity, GREATEST(0, poi.quantity - COALESCE(poi.allocated_quantity, 0)))) as pending_qty
        FROM public.purchase_order_items poi
        JOIN public.purchase_orders po ON po.id = poi.purchase_order_id
        WHERE po.verification_status NOT IN ('Delivered', 'Cancelled')
          AND COALESCE(poi.remaining_quantity, GREATEST(0, poi.quantity - COALESCE(poi.allocated_quantity, 0))) > 0
        GROUP BY poi.sku
      ) pending_po ON pending_po.sku = inv.sku
      ORDER BY inv.updated_at DESC, inv.sku ASC;
    `),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  const items = invRes.rows.map((r: any) => ({
    id: r.id,
    sku: r.sku,
    productName: r.product_name,
    brand: r.brand || "Generic",
    categoryName: r.category_name,
    branchCode: r.branch_code || "HYD-HQ",
    physicalStock: Number(r.physical_stock || 0),
    allocatedStock: Number(r.allocated_stock || 0),
    reservedStock: Number(r.reserved_stock || 0),
    availableStock: Number(r.available_stock || 0),
    pendingPoQty: Number(r.pending_po_qty || 0),
    reorderLevel: Number(r.reorder_level || 10),
    stockStatus: r.stock_status,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  }));

  return (
    <StockAvailabilityClient
      initialInventory={serializeData(items)}
      categories={serializeData(categories)}
      branches={serializeData(branches)}
    />
  );
}
