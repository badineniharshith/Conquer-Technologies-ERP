import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { customerCode: { contains: search, mode: "insensitive" } },
        { gstNumber: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          region: true,
          branch: true,
          assignedExecutive: { select: { id: true, name: true, email: true } },
          assignedManager: { select: { id: true, name: true, email: true } },
          _count: { select: { purchaseOrders: true, reservations: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      })
    ]);

    const stats = {
      total: await prisma.customer.count(),
      active: await prisma.customer.count({ where: { status: "ACTIVE" } }),
      pending: await prisma.customer.count({ where: { status: "PENDING" } }),
      totalCreditLimit: 500000 * totalCount,
      totalCreditUsed: 120000 * totalCount,
    };

    return NextResponse.json({
      success: true,
      data: serializeData(customers),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats
    });
  } catch (err: any) {
    console.error("GET /api/admin/customers error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, gstNumber, panNumber, customerType, billingAddress, shippingAddress } = body;

    if (!name) {
      return NextResponse.json({ error: "Customer company name is required" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        gstNumber,
        panNumber,
        customerType: customerType || "STANDARD",
        billingAddress,
        shippingAddress,
        status: "ACTIVE",
        creditLimit: 500000,
        creditUsed: 0,
      }
    });

    return NextResponse.json({ success: true, customer: serializeData(customer) });
  } catch (err: any) {
    console.error("POST /api/admin/customers error:", err);
    return NextResponse.json({ error: err.message || "Failed to create customer" }, { status: 500 });
  }
}
