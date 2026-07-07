import { erpDb } from "@/lib/db";
import PricingHistoryClient from "@/components/pricing/PricingHistoryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ sku?: string }>;
}

export default async function PricingHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const products = await erpDb.products.findMany();
  const prices = await erpDb.productPrices.findMany();

  const sku = params.sku || products[0]?.sku || "";

  const history = await erpDb.productPriceHistory.findMany({
    where: { sku: sku },
    orderBy: { updatedAt: "asc" }
  });

  return (
    <PricingHistoryClient
      products={products}
      prices={prices}
      history={history}
      searchSku={sku}
    />
  );
}
