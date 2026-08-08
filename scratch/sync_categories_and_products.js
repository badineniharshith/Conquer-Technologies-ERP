const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoriesData = [
  // Apple BU
  { businessUnit: "Apple BU", name: "End Compute (Apple)", oem: "Apple", description: "Apple MacBooks, iMacs, Mac Studio, Mac Mini, iPad Pro" },
  { businessUnit: "Apple BU", name: "Third Party Care packs", oem: "Onsitego, OneAssist, Servify", description: "Extended Warranty, Damage Protection, AppleCare Sync" },
  { businessUnit: "Apple BU", name: "Leasing Partners", oem: "Tata Capital, Orix, RentAlpha", description: "Device as a Service (DaaS) & Enterprise Hardware Leasing" },
  { businessUnit: "Apple BU", name: "Trade in Partners", oem: "Cashify, Servify, EnviroKare", description: "Buyback, Asset Trade-In, E-Waste Recycling" },

  // Wintel BU
  { businessUnit: "Wintel BU", name: "End Compute (Wintel)", oem: "Lenovo, HPI, Dell, Asus, MSI, Acer, Prime Book / Samsung", description: "Windows Laptops, Commercial PCs, Workstations, Chromebooks" },
  { businessUnit: "Wintel BU", name: "Unified Communications", oem: "Cisco, Samsung, LG, Logitech, Yealink, HP Poly, Epos, Jabra, Boat, Noise, Hammer", description: "Video Conferencing Systems, Soundbars, Headsets, IP Phones" },
  { businessUnit: "Wintel BU", name: "Server/WS", oem: "HPE, Dell, Lenovo, Super Micro, Cisco", description: "Rack Servers, Tower Servers, Blade Systems, AI Workstations" },
  { businessUnit: "Wintel BU", name: "Storage", oem: "HPE, Dell, Lenovo, Netapp, Synology", description: "SAN/NAS Storage Arrays, Backup Vaults, All-Flash Arrays" },
  { businessUnit: "Wintel BU", name: "Software (Wintel)", oem: "Microsoft, Adobe, Autodesk, Hexnode, Zoom / Teams, Avaya Connect, Atlassian", description: "Enterprise Licenses, CAD/3D Software, Collaboration Tools" },
  { businessUnit: "Wintel BU", name: "Active/ Security", oem: "Fortinet, Checkpoint, PaloAlto, Cisco, Sonicwall, Sophos", description: "Next-Gen Firewalls, Switches, Routers, VPN Appliances" },
  { businessUnit: "Wintel BU", name: "Accessories", oem: "Logitech / Rapoo, Belkin, BenQ / LG / Samsung, Cables, Portronics, Complete Accessories", description: "Monitors, Docks, Keyboards, Mice, Cables, Adapters" },

  // Solutions BU
  { businessUnit: "Solutions BU", name: "Workspace Solutions", oem: "Microsoft O365, GWS, Zoho Workspace", description: "Cloud Productivity Suites & Enterprise Mail Solutions" },
  { businessUnit: "Solutions BU", name: "Collaboration Services", oem: "Webex", description: "Cloud Video Meetings & Enterprise Telephony" },
  { businessUnit: "Solutions BU", name: "Cybersecurity", oem: "Fortinet, Radware", description: "DDoS Protection, Cloud Security, Threat Intelligence" },
  { businessUnit: "Solutions BU", name: "MDM", oem: "SentinelONE", description: "Mobile Device Management, Endpoint Protection & EDR" },
  { businessUnit: "Solutions BU", name: "Creative Solutions", oem: "Adobe, Canva", description: "Creative Cloud, Vector Design, Enterprise Media Tools" },
  { businessUnit: "Solutions BU", name: "Server/ Maintainence Software", oem: "Motadata, Nvidia, Sophos & Sonicwall", description: "AIOps, Network Monitoring, GPU Drivers & Server Protection" },
  { businessUnit: "Solutions BU", name: "Other Solutions", oem: "ProcUrPal AI", description: "AI Procurement Automation, ERP Integrations & Smart Bots" },
];

async function seedCategoriesAndProducts() {
  console.log("=== SEEDING PRODUCT CATEGORIES & MAPPING CRM PRODUCTS ===");

  const categoryMap = new Map();

  for (const cat of categoriesData) {
    const fullName = `${cat.businessUnit} - ${cat.name}`;
    let existing = await prisma.category.findFirst({
      where: { OR: [{ name: fullName }, { name: cat.name }] }
    });

    if (!existing) {
      existing = await prisma.category.create({
        data: {
          name: fullName,
          status: "ACTIVE"
        }
      });
      console.log(`Created category: ${fullName}`);
    } else {
      console.log(`Found category: ${existing.name}`);
    }
    categoryMap.set(cat.name, existing);
    categoryMap.set(fullName, existing);
  }

  // Get branches from database
  const dbBranches = await prisma.branch.findMany();

  for (let i = 0; i < categoriesData.length; i++) {
    const catInfo = categoriesData[i];
    const catDb = categoryMap.get(catInfo.name);

    const oems = catInfo.oem.split(',').map(o => o.trim());
    for (let j = 0; j < Math.min(oems.length, 3); j++) {
      const oemName = oems[j];
      const sku = `${catInfo.businessUnit.substring(0, 3)}-${oemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()}-${i + 1}0${j + 1}`;
      const prodName = `${oemName} ${catInfo.name} Enterprise Solution`;

      let productObj = await prisma.product.findFirst({
        where: { OR: [{ sku }, { name: prodName }] }
      });

      if (!productObj) {
        productObj = await prisma.product.create({
          data: {
            sku,
            name: prodName,
            brand: oemName,
            category: { connect: { id: catDb.id } },
            reorderLevel: 10,
            safetyStock: 5,
            status: "ACTIVE",
            sellingPrice: 75000 + (i * 5000) + (j * 2000),
            costPrice: (75000 + (i * 5000) + (j * 2000)) * 0.75,
          }
        });
        console.log(`  -> Added product: ${prodName} (${sku}) -> Category: ${catDb.name}`);
      } else {
        await prisma.product.update({
          where: { id: productObj.id },
          data: { categoryId: catDb.id, status: "ACTIVE" }
        });
      }

      // Ensure branch inventory records exist for this product
      for (const branch of dbBranches) {
        const inv = await prisma.inventory.findFirst({
          where: { sku: productObj.sku, branchId: branch.id }
        });
        if (!inv) {
          await prisma.inventory.create({
            data: {
              productId: productObj.id,
              branchId: branch.id,
              branchCode: branch.code || "HYD-HQ",
              sku: productObj.sku,
              itemName: productObj.name,
              quantity: 150,
              availableQty: 120,
              reservedQty: 30,
              availableStock: 120
            }
          }).catch(e => {});
        }
      }
    }
  }

  console.log("=== SUCCESS: ALL PRODUCT CATEGORIES & PRODUCTS SYNCED SUCCESSFULLY ===");
}

seedCategoriesAndProducts()
  .catch(e => console.error("Error seeding categories & products:", e))
  .finally(() => prisma.$disconnect());
