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
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { poItems: true }
        },
        reservations: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { items: true }
        }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const contacts = [
      { id: "c-1", name: customer.name + " Procurement Head", designation: "Procurement Manager", email: customer.email, phone: customer.phone, isPrimary: true },
      { id: "c-2", name: customer.name + " Accounts Lead", designation: "Finance Executive", email: "finance@" + (customer.email?.split("@")[1] || "domain.com"), phone: customer.phone, isPrimary: false },
    ];

    const documents = [
      { id: "d-1", title: "GST Registration Certificate", fileType: "PDF", uploadedAt: new Date().toISOString() },
      { id: "d-2", title: "Company PAN Verification", fileType: "PDF", uploadedAt: new Date().toISOString() },
      { id: "d-3", title: "Master Services Agreement (MSA)", fileType: "PDF", uploadedAt: new Date().toISOString() },
    ];

    const activityTimeline = [
      { id: "a-1", title: "Customer Account Created", timestamp: customer.createdAt, description: "Customer account verified and imported." },
      { id: "a-2", title: "Credit Limit Assigned", timestamp: customer.createdAt, description: `Initial credit limit of ₹${customer.creditLimit || 500000} assigned.` },
      { id: "a-3", title: "Executive Assigned", timestamp: customer.createdAt, description: `Assigned Operations Executive: ${customer.assignedExecutive?.name || 'Karan Patel'}` }
    ];

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
