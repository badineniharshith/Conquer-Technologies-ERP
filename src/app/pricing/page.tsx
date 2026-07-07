import { erpDb } from "@/lib/db";
import PriceIntelligenceClient from "@/components/pricing/PriceIntelligenceClient";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const prices = await erpDb.productPrices.findMany();
  const priceHistory = await erpDb.productPriceHistory.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const products = await erpDb.products.findMany();
  const uploads: any[] = [];

  return (
    <PriceIntelligenceClient
      prices={prices}
      priceHistory={priceHistory}
      products={products}
      uploads={uploads}
    />
  );
}
