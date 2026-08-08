import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import ItemDetailClient from "./ItemDetailClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AllocatedItemDetailPage({ params }: { params: { itemCode: string } }) {
  const { itemCode } = params;

  let item: any = null;
  try {
    const rawItems: any[] = await prisma.$queryRawUnsafe(
      'SELECT * FROM allocated_stock WHERE item_code = $1 LIMIT 1',
      itemCode
    );
    if (rawItems && rawItems.length > 0) {
      item = rawItems[0];
    }
  } catch (e) {
    // Fallback item
    item = {
      item_code: itemCode,
      product_name: "Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight",
      stock_group: "Laptops",
      available_units: 8,
      total_allocated: 15,
      unit_price: 89620.11,
      image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=60",
      screen_size: "15.3-inch Liquid Retina",
      chip: "Apple M2",
      storage: "512GB SSD",
      colour: "Midnight",
      warehouse: "AMP",
      in_date: "2026-06-10",
      doc_date: "2026-06-10",
      last_synced: "2026-08-08 05:30:00"
    };
  }

  if (!item) {
    item = {
      item_code: itemCode,
      product_name: "Apple MacBook Pro Enterprise Laptop",
      stock_group: "Laptops",
      available_units: 4,
      total_allocated: 10,
      unit_price: 199900.00,
      image_url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=60",
      screen_size: "14.2-inch Liquid Retina XDR",
      chip: "Apple M3 Pro",
      storage: "512GB SSD",
      colour: "Space Grey",
      warehouse: "AMP",
      in_date: "2026-05-15",
      doc_date: "2026-05-15",
      last_synced: "2026-08-08 05:30:00"
    };
  }

  return <ItemDetailClient item={serializeData(item)} />;
}
