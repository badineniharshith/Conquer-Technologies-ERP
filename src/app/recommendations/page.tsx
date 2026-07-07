import { erpDb } from "@/lib/db";
import RecommendationsClient from "./RecommendationsClient";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const [products, prices, inventory] = await Promise.all([
    erpDb.products.findMany(),
    erpDb.productPrices.findMany(),
    erpDb.inventory.findMany(),
  ]);

  return (
    <RecommendationsClient
      products={products}
      prices={prices}
      inventory={inventory}
    />
  );
}
