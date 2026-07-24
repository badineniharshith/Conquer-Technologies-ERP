// scripts/seed-enterprise-data.js
// Seeds 207 Employees and 300 Enterprise Customers with zero fake/cricketer names

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "Arjun", "Rahul", "Karthik", "Pranav", "Aditya", "Neha", "Sneha", "Priya", "Aditi", "Ananya",
  "Vivek", "Rohan", "Sandeep", "Akash", "Nikhil", "Mohit", "Harish", "Deepak", "Abhishek", "Pooja", "Vikram",
  "Siddharth", "Gautam", "Tarun", "Varun", "Manish", "Rajesh", "Suresh", "Ramesh", "Kiran", "Vijay",
  "Rishi", "Aravind", "Shruti", "Kavya", "Divya", "Swati", "Ritu", "Meera", "Shalini", "Rashmi",
  "Preeti", "Deepika", "Sunita", "Anita", "Poonam", "Smita", "Aarti", "Archana", "Bhavna", "Chetna",
  "Dinesh", "Eashwar", "Farhan", "Ganesh", "Hemant", "Ishaan", "Jatin", "Kunal", "Lalit", "Manoj",
  "Nitin", "Omkar", "Pankaj", "Quamar", "Rajiv", "Sachin", "Tushar", "Umesh", "Vinay", "Yash"
];

const LAST_NAMES = [
  "Mehta", "Sharma", "Reddy", "Nair", "Verma", "Kapoor", "Iyer", "Menon", "Rao", "Das",
  "Joshi", "Kulkarni", "Kumar", "Patel", "Gupta", "Babu", "Singh", "Jain", "Shah", "Chawla",
  "Deshmukh", "Choudhury", "Bhat", "Shenoy", "Pillai", "Agarwal", "Bansal", "Goel", "Saxena", "Srivastava",
  "Mishra", "Pandey", "Trivedi", "Shukla", "Dwivedi", "Chatterjee", "Banerjee", "Mukherjee", "Dutta", "Ghosh",
  "Sengupta", "Roy", "Sen", "Chakraborty", "Bhowmick", "Nandi", "Nath", "Saha", "Basu", "Mitra"
];

const COMPANIES = [
  "Oracle India", "Microsoft India", "IBM India", "Dell Technologies", "Cisco Systems",
  "SAP India", "Intel India", "Adobe Systems", "Infosys Limited", "Tata Consultancy Services",
  "Wipro Enterprise", "Cognizant Technology Solutions", "Capgemini India", "Accenture Solutions",
  "HCL Technologies", "Tech Mahindra", "L&T Technology Services", "Bosch India", "Siemens India",
  "Honeywell Automation", "Hitachi Vantara", "Fujitsu India", "Lenovo India", "HP Enterprise India",
  "Schneider Electric", "ABB India", "Emerson Electric", "Philips India", "Panasonic India",
  "Sony India", "Canon India", "Epson India", "Mindtree Limited", "Mphasis India", "Cyient Technologies"
];

const BRANCH_IDS = ["HYD-HQ", "HYD-THUB", "HYD-JH", "BLR", "CHN", "MUM", "DEL", "VZG", "VJA"];
const DEPARTMENTS = ["Supply Chain Management", "Logistics Operations", "Procurement & SCM", "Warehouse Operations", "Inventory Control"];
const CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Mumbai", "Gurgaon", "Visakhapatnam", "Vijayawada", "Pune"];
const STATES = ["Telangana", "Karnataka", "Tamil Nadu", "Maharashtra", "Haryana", "Andhra Pradesh"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(idx) {
  return `+91 ${98000 + (idx % 900)} ${(10000 + (idx * 37) % 89999)}`;
}

function generateGst(idx) {
  const code = (idx % 35 + 10).toString(36).toUpperCase();
  return `36AABCC${String(idx).padStart(4, "0")}${code}1Z5`;
}

async function main() {
  console.log("🚀 Starting Enterprise Seeding for Phase 17.1...");

  const defaultPasswordHash = bcrypt.hashSync("Admin@123", 10);
  const custPasswordHash = bcrypt.hashSync("Admin@123", 10);

  // Clean up existing StockReservation, PurchaseOrder relations or users if needed
  console.log("Cleaning old user data...");
  await prisma.notification.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.poItem.deleteMany({});
  await prisma.stockReservation.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Cleared old notifications, opportunities, reservations, purchase orders, and users.");

  let empCounter = 1;
  let custCounter = 1;

  // 1. Super Admin (L0)
  const superAdmin = await prisma.user.create({
    data: {
      name: "Corporate Super Admin",
      email: "superadmin@conquererp.com",
      passwordHash: defaultPasswordHash,
      roleId: "SUPER_ADMIN",
      employeeId: `EMP${String(empCounter++).padStart(6, "0")}`,
      branchId: "HYD-HQ",
      branchName: "Hyderabad Corporate Office",
      status: "ACTIVE",
      isActive: true,
      department: "Executive Leadership",
      designation: "Chief Executive Officer",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      phone: "+91 99000 11000",
      address: "Conquer HQ, Financial District, Gachibowli, Hyderabad"
    }
  });
  console.log(`✅ Created Super Admin: ${superAdmin.name} (${superAdmin.employeeId})`);

  // 2. Directors (L1 - 3 Directors)
  const directorNames = ["Arjun Mehta", "Rahul Sharma", "Karthik Reddy"];
  const directors = [];
  for (let i = 0; i < directorNames.length; i++) {
    const name = directorNames[i];
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@conquererp.com`;
    const d = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: defaultPasswordHash,
        roleId: "DIRECTOR_OPERATIONS",
        employeeId: `EMP${String(empCounter++).padStart(6, "0")}`,
        reportsToId: superAdmin.id,
        branchId: BRANCH_IDS[i % BRANCH_IDS.length],
        branchName: "Corporate Operations",
        status: "ACTIVE",
        isActive: true,
        department: "Operations Leadership",
        designation: "Director of Operations",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        phone: generatePhone(i + 1),
        address: `Suite ${i + 101}, Executive Towers, Gachibowli`
      }
    });
    directors.push(d);
    console.log(`  ✅ Director L1: ${d.name} (${d.employeeId}) -> Reports to Super Admin`);
  }

  // 3. Operations / SCM / Logistics Managers (L2 - 8 Managers)
  const managerNames = [
    "Pranav Nair", "Aditya Verma", "Neha Kapoor", "Sneha Iyer",
    "Priya Menon", "Aditi Rao", "Ananya Das", "Vivek Joshi"
  ];
  const managers = [];
  for (let i = 0; i < managerNames.length; i++) {
    const name = managerNames[i];
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@conquererp.com`;
    const director = directors[i % directors.length];
    const branchId = BRANCH_IDS[i % BRANCH_IDS.length];
    const m = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: defaultPasswordHash,
        roleId: "OPERATIONS_MANAGER",
        employeeId: `EMP${String(empCounter++).padStart(6, "0")}`,
        reportsToId: director.id,
        branchId,
        branchName: branchId,
        status: "ACTIVE",
        isActive: true,
        department: getRandomItem(DEPARTMENTS),
        designation: i % 2 === 0 ? "Logistics Manager" : "SCM Operations Manager",
        city: CITIES[i % CITIES.length],
        state: STATES[i % STATES.length],
        country: "India",
        phone: generatePhone(i + 10),
        address: `Plot ${i * 5 + 12}, Tech Zone, ${CITIES[i % CITIES.length]}`
      }
    });
    managers.push(m);
    console.log(`    ✅ Manager L2: ${m.name} (${m.employeeId}) -> Reports to ${director.name}`);
  }

  // 4. Assistant Managers (L3 - 20 Assistant Managers)
  const asstManagerNames = [
    "Rohan Kulkarni", "Sandeep Kumar", "Akash Patel", "Nikhil Rao", "Mohit Gupta",
    "Harish Babu", "Deepak Singh", "Abhishek Jain", "Pooja Shah", "Vikram Deshmukh",
    "Siddharth Bhat", "Gautam Shenoy", "Tarun Pillai", "Varun Agarwal", "Manish Bansal",
    "Rajesh Goel", "Suresh Saxena", "Ramesh Srivastava", "Kiran Mishra", "Vijay Pandey"
  ];
  const asstManagers = [];
  for (let i = 0; i < asstManagerNames.length; i++) {
    const name = asstManagerNames[i];
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@conquererp.com`;
    const manager = managers[i % managers.length];
    const branchId = BRANCH_IDS[i % BRANCH_IDS.length];
    const am = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: defaultPasswordHash,
        roleId: "ASSISTANT_MANAGER",
        employeeId: `EMP${String(empCounter++).padStart(6, "0")}`,
        reportsToId: manager.id,
        branchId,
        branchName: branchId,
        status: "ACTIVE",
        isActive: true,
        department: getRandomItem(DEPARTMENTS),
        designation: "Assistant Operations Manager",
        city: CITIES[i % CITIES.length],
        state: STATES[i % STATES.length],
        country: "India",
        phone: generatePhone(i + 50),
        address: `Sector ${i + 4}, Industrial Park, ${CITIES[i % CITIES.length]}`
      }
    });
    asstManagers.push(am);
  }
  console.log(`  ✅ Created ${asstManagers.length} Assistant Managers (L3) mapped to Managers.`);

  // 5. Operations Executives (L4 - 175 Executives)
  const executives = [];
  const totalExecutivesTarget = 175;

  for (let i = 0; i < totalExecutivesTarget; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i + 1}@conquererp.com`;
    const asstManager = asstManagers[i % asstManagers.length];
    const branchId = BRANCH_IDS[i % BRANCH_IDS.length];

    const exec = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: defaultPasswordHash,
        roleId: "OPERATIONS_EXECUTIVE",
        employeeId: `EMP${String(empCounter++).padStart(6, "0")}`,
        reportsToId: asstManager.id,
        branchId,
        branchName: branchId,
        status: "ACTIVE",
        isActive: true,
        department: getRandomItem(DEPARTMENTS),
        designation: "Operations Executive",
        city: CITIES[i % CITIES.length],
        state: STATES[i % STATES.length],
        country: "India",
        phone: generatePhone(i + 100),
        address: `Building ${i % 15 + 1}, Tech Hub, ${CITIES[i % CITIES.length]}`
      }
    });
    executives.push(exec);
  }
  console.log(`  ✅ Created ${executives.length} Operations Executives (L4) mapped to Asst. Managers.`);
  console.log(`\n🎉 Total Employees Seeded: ${empCounter - 1}`);

  // 6. Enterprise Customers (300+ Customers)
  console.log("\n🏢 Seeding 300+ Enterprise Customers...");
  const totalCustomersTarget = 300;
  const customers = [];

  for (let i = 0; i < totalCustomersTarget; i++) {
    const companyBase = COMPANIES[i % COMPANIES.length];
    const companyName = i < COMPANIES.length ? companyBase : `${companyBase} Unit ${Math.floor(i / COMPANIES.length) + 1}`;
    const contactFirstName = FIRST_NAMES[(i + 5) % FIRST_NAMES.length];
    const contactLastName = LAST_NAMES[(i + 7) % LAST_NAMES.length];
    const contactPerson = `${contactFirstName} ${contactLastName}`;
    const email = `${contactFirstName.toLowerCase()}.${contactLastName.toLowerCase()}.${i + 1}@${companyBase.toLowerCase().replace(/[^a-z]/g, "")}.com`;
    const assignedExec = executives[i % executives.length];
    const branchId = assignedExec.branchId;

    const cust = await prisma.user.create({
      data: {
        name: contactPerson,
        email,
        passwordHash: custPasswordHash,
        roleId: "CUSTOMER",
        customerId: `CUS${String(custCounter++).padStart(6, "0")}`,
        companyName,
        gstNumber: generateGst(i + 1),
        reportsToId: assignedExec.id,
        assignedEmployeeId: assignedExec.id,
        branchId,
        branchName: assignedExec.branchName || "Head Office",
        status: i % 15 === 0 ? "PENDING" : "ACTIVE",
        isActive: i % 15 !== 0,
        phone: generatePhone(i + 500),
        address: `Corporate Office Plot ${i * 3 + 15}, IT Expressway`,
        city: CITIES[i % CITIES.length],
        state: STATES[i % STATES.length],
        country: "India",
        customerType: "ENTERPRISE"
      }
    });
    customers.push(cust);
  }

  console.log(`✅ Seeded ${customers.length} Enterprise Customers (CUS000001 to CUS${String(custCounter - 1).padStart(6, "0")}) distributed across Executives.`);

  // 7. Seed initial StockReservations and PurchaseOrders to demonstrate live data
  console.log("\n📦 Seeding realistic StockReservations and PurchaseOrders...");

  const sampleProducts = await prisma.product.findMany({ take: 10 });
  if (sampleProducts.length > 0) {
    for (let i = 0; i < 20; i++) {
      const customer = customers[i % customers.length];
      const exec = executives[i % executives.length];
      const product = sampleProducts[i % sampleProducts.length];
      const qty = (i + 1) * 25;
      const resDate = new Date();
      resDate.setDate(resDate.getDate() - i);
      const expDate = new Date(resDate);
      expDate.setDate(expDate.getDate() + 5);

      await prisma.stockReservation.create({
        data: {
          reservationNumber: `RES-2026-${String(i + 1).padStart(4, "0")}`,
          customerId: customer.id,
          employeeId: exec.id,
          productId: product.id,
          sku: product.sku,
          branchCode: exec.branchId || "HYD-HQ",
          quantity: qty,
          status: i % 3 === 0 ? "ACCEPTED" : i % 4 === 0 ? "PENDING" : "ACTIVE",
          expiresAt: expDate,
          createdAt: resDate,
          project: `${customer.companyName} Expansion Q${(i % 4) + 1}`
        }
      });
    }
    console.log("  ✅ Seeded 20 Stock Reservations.");

    for (let i = 0; i < 15; i++) {
      const customer = customers[i % customers.length];
      const product = sampleProducts[i % sampleProducts.length];
      const poDate = new Date();
      poDate.setDate(poDate.getDate() - i * 2);

      await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-2026-${String(i + 101).padStart(4, "0")}`,
          customerId: customer.id,
          customerName: customer.name,
          companyName: customer.companyName || customer.name,
          totalAmount: (i + 1) * 45000,
          dateReceived: poDate,
          expectedDelivery: new Date(poDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          totalItems: (i + 1) * 10,
          stockStatus: i % 2 === 0 ? "In Stock" : "Shortage",
          verificationStatus: i % 3 === 0 ? "Verified" : "Pending",
          branchCode: customer.branchId || "HYD-HQ",
          itemsJson: JSON.stringify([{ sku: product.sku, quantity: (i + 1) * 10, unitPrice: 4500 }])
        }
      });
    }
    console.log("  ✅ Seeded 15 Purchase Orders.");
  }

  console.log("\n✨ PHASE 17.1 ENTERPRISE DATA SEEDING COMPLETE! ✨");
}

main()
  .catch(e => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
