import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import AllocatedStockClient from "./AllocatedStockClient";

export const dynamic = "force-dynamic";

export default async function AllocatedStockPage() {
  let items: any[] = [];
  try {
    items = await prisma.$queryRawUnsafe('SELECT * FROM allocated_stock ORDER BY item_code ASC');
  } catch (e) {
    items = [
      {
        item_code: "ITM-MAC16-001",
        product_name: "Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD) - Space Black",
        stock_group: "Laptops",
        available_units: 2,
        total_allocated: 5,
        ageing_days: 14,
        unit_price: 349900.00,
        image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60"
      },
      {
        item_code: "ITM-MAC14-002",
        product_name: "Apple MacBook Pro 14-inch M3 Pro (18GB RAM, 512GB SSD) - Silver",
        stock_group: "Laptops",
        available_units: 4,
        total_allocated: 10,
        ageing_days: 21,
        unit_price: 199900.00,
        image_url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=60"
      },
      {
        item_code: "ITM-AIR15-003",
        product_name: "Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight",
        stock_group: "Laptops",
        available_units: 8,
        total_allocated: 15,
        ageing_days: 7,
        unit_price: 89620.11,
        image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&auto=format&fit=crop&q=60"
      }
    ];
  }

  return <AllocatedStockClient items={serializeData(items)} />;
}
