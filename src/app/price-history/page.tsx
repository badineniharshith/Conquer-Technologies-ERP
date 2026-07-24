import { erpDb } from "@/lib/db";
import PriceHistoryClient from "./PriceHistoryClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ sku?: string; compareSku?: string }>;
}

export default async function PriceHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const products = await erpDb.products.findMany();
  const categories = await erpDb.categories.findMany();
  const purchaseOrders = await erpDb.purchaseOrders.findMany();
  const reservations = await erpDb.stockReservations.findMany();

  const sku = params.sku || products[0]?.sku || "";
  const compareSku = params.compareSku || products[1]?.sku || "";

  const history = await erpDb.productPriceHistory.findMany({
    where: {
      sku: { in: [sku, compareSku] }
    },
    orderBy: { updatedAt: "asc" }
  });

  return (
    <PriceHistoryClient
      initialHistory={history}
      products={products}
      categories={categories}
      purchaseOrders={purchaseOrders}
      reservations={reservations}
      searchSku={sku}
      searchCompareSku={compareSku}
    />
  );
}
