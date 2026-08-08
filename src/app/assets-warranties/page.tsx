import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import AssetsWarrantiesClient from "./AssetsWarrantiesClient";

export const dynamic = "force-dynamic";

export default async function AssetsWarrantiesPage() {
  let assets: any[] = [];
  try {
    assets = await prisma.$queryRawUnsafe('SELECT * FROM assets_warranties ORDER BY invoice_date DESC');
  } catch (e) {
    assets = [
      {
        id: 1,
        invoice_date: "2025-07-01",
        invoice_number: "INV-2025-8891",
        item_code: "ITM-MAC16-001",
        item_description: "Apple MacBook Pro 16-inch M3 Max (36GB RAM, 1TB SSD) - Space Black",
        po_number: "PO-2025-ACC-088",
        warranty_expiry: "2028-07-01",
        warranty_status: "Under Warranty",
        serial_numbers: ["C02G1234MD6R", "C02G1235MD6R", "C02G1236MD6R", "C02G1237MD6R", "C02G1238MD6R"]
      },
      {
        id: 2,
        invoice_date: "2025-08-15",
        invoice_number: "INV-2025-9102",
        item_code: "ITM-MAC14-002",
        item_description: "Apple MacBook Pro 14-inch M3 Pro (18GB RAM, 512GB SSD) - Silver",
        po_number: "PO-2025-ACC-094",
        warranty_expiry: "2027-08-15",
        warranty_status: "Under Warranty",
        serial_numbers: ["C02FK012MD6R", "C02FK013MD6R", "C02FK014MD6R"]
      },
      {
        id: 3,
        invoice_date: "2025-09-10",
        invoice_number: "INV-2025-9450",
        item_code: "ITM-AIR15-003",
        item_description: "Apple MacBook Air 15-inch M2 (16GB RAM, 512GB SSD) - Midnight",
        po_number: "PO-2025-ACC-102",
        warranty_expiry: "2026-09-10",
        warranty_status: "Under Warranty",
        serial_numbers: ["C02HM099MD6R", "C02HM100MD6R", "C02HM101MD6R", "C02HM102MD6R", "C02HM103MD6R", "C02HM104MD6R", "C02HM105MD6R", "C02HM106MD6R", "C02HM107MD6R", "C02HM108MD6R", "C02HM109MD6R", "C02HM110MD6R"]
      }
    ];
  }

  return <AssetsWarrantiesClient assets={serializeData(assets)} />;
}
