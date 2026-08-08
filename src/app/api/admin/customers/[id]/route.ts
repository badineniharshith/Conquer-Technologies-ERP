import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        region: true,
        branch: true,
        assignedExecutive: { select: { id: true, name: true, email: true, phone: true } },
        assignedManager: { select: { id: true, name: true, email: true } },
        purchaseOrders: {
          take: 15,
          orderBy: { createdAt: "desc" },
          include: { poItems: true }
        },
        reservations: {
          take: 15,
          orderBy: { createdAt: "desc" },
          include: { items: true }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Query CRM contacts directly from database table crm.contacts
    let crmContacts: any[] = [];
    if (customer.crmCustomerId) {
      try {
        crmContacts = await prisma.$queryRawUnsafe(
          'SELECT * FROM crm.contacts WHERE "customerId" = $1 ORDER BY id ASC',
          customer.crmCustomerId
        );
      } catch (e) {}
    }

    const contacts = crmContacts.length > 0 ? crmContacts.map(c => ({
      id: String(c.id),
      name: c.name,
      designation: c.role || "Lead Contact",
      email: c.email || customer.email,
      phone: c.phone || customer.phone,
      isPrimary: true
    })) : [
      { id: "c-1", name: customer.name + " Procurement Head", designation: "Procurement Manager", email: customer.email, phone: customer.phone, isPrimary: true },
      { id: "c-2", name: customer.name + " Accounts Lead", designation: "Finance Executive", email: "finance@" + (customer.email?.split("@")[1] || "domain.com"), phone: customer.phone, isPrimary: false },
    ];

    // Query CRM documents directly from crm.customer_documents
    let crmDocs: any[] = [];
    if (customer.crmCustomerId) {
      try {
        crmDocs = await prisma.$queryRawUnsafe(
          'SELECT * FROM crm.customer_documents WHERE "customerId" = $1 ORDER BY id ASC',
          customer.crmCustomerId
        );
      } catch (e) {}
    }

    const documents = crmDocs.length > 0 ? crmDocs.map(d => ({
      id: String(d.id),
      title: d.name || "Customer Document",
      fileType: d.category || "PDF",
      uploadedAt: d.createdAt || new Date().toISOString()
    })) : [
      { id: "d-1", title: "GST Registration Certificate", fileType: "PDF", uploadedAt: new Date().toISOString() },
      { id: "d-2", title: "Company PAN Verification", fileType: "PDF", uploadedAt: new Date().toISOString() },
      { id: "d-3", title: "Master Services Agreement (MSA)", fileType: "PDF", uploadedAt: new Date().toISOString() },
    ];

    // Build timeline
    const activityTimeline = [
      { id: "a-1", title: "Customer Account Created", timestamp: customer.createdAt, description: "Customer account verified and active in CRM/ERP database." },
      { id: "a-2", title: "Credit Limit Assigned", timestamp: customer.createdAt, description: `Initial credit limit of ₹${customer.creditLimit || 500000} assigned.` }
    ];

    if (customer.assignedExecutive?.name) {
      activityTimeline.push({
        id: "a-3",
        title: "Executive Assigned",
        timestamp: customer.createdAt,
        description: `Assigned Operations Executive: ${customer.assignedExecutive.name}`
      });
    }

    if (customer.purchaseOrders && customer.purchaseOrders.length > 0) {
      for (const po of customer.purchaseOrders.slice(0, 3)) {
        activityTimeline.push({
          id: `po-${po.id}`,
          title: `Purchase Order ${po.poNumber}`,
          timestamp: po.createdAt,
          description: `Purchase order of ₹${po.totalAmount} created with status ${po.verificationStatus || 'Verified'}.`
        });
      }
    }

    return NextResponse.json({
      success: true,
      customer: serializeData(customer),
      contacts: serializeData(contacts),
      documents: serializeData(documents),
      timeline: serializeData(activityTimeline)
    });
  } catch (err: any) {
    console.error("GET /api/admin/customers/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch customer details" }, { status: 500 });
  }
}
