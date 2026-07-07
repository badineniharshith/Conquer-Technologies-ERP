import { erpDb } from "@/lib/db";
import CategoriesClient from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [categories, products] = await Promise.all([
    erpDb.categories.findMany(),
    erpDb.products.findMany(),
  ]);

  return <CategoriesClient categories={categories} products={products} />;
}
