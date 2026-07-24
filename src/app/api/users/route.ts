import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/users - Fetch hierarchy tree or users based on requesting user role
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const mode = searchParams.get("mode"); // "tree" or "list"

    let currentUser = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
    }

    const allUsers = await prisma.user.findMany({
      include: {
        role: true,
        branch: true,
        reportsTo: {
          select: { id: true, name: true, email: true, roleId: true, employeeId: true }
        },
        subordinates: {
          select: { id: true, name: true, email: true, roleId: true, employeeId: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const allRoles = await prisma.role.findMany();
    const allBranches = await prisma.branch.findMany();

    if (mode === "tree") {
      // Build hierarchical tree starting from top level
      // Roles hierarchy: SUPER_ADMIN -> DIRECTOR_OPERATIONS -> OPERATIONS_MANAGER -> ASSISTANT_MANAGER -> OPERATIONS_EXECUTIVE -> CUSTOMER
      const userMap = new Map();
      allUsers.forEach(u => userMap.set(u.id, { ...u, children: [] }));

      const rootNodes: any[] = [];

      allUsers.forEach(u => {
        const node = userMap.get(u.id);
        if (u.reportsToId && userMap.has(u.reportsToId)) {
          userMap.get(u.reportsToId).children.push(node);
        } else {
          rootNodes.push(node);
        }
      });

      // Filter tree visibility according to user role if currentUser specified
      if (currentUser && currentUser.roleId !== "SUPER_ADMIN") {
        const userNode = userMap.get(currentUser.id);
        return NextResponse.json({
          tree: userNode ? [userNode] : [],
          users: allUsers,
          roles: allRoles,
          branches: allBranches
        });
      }

      return NextResponse.json({
        tree: rootNodes,
        users: allUsers,
        roles: allRoles,
        branches: allBranches
      });
    }

    return NextResponse.json({ users: allUsers, roles: allRoles, branches: allBranches });
  } catch (err: any) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - Create new user or Customer account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, roleId, branchId, reportsToId, password, status, gstNumber, companyName, address } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and Email are required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 400 });
    }

    const assignedRole = roleId || "CUSTOMER";
    // Phase 4 Rule: Customer accounts created by Operations Executive start as PENDING approval
    const initialStatus = status ? status : (assignedRole === "CUSTOMER" ? "PENDING" : "ACTIVE");

    const passwordHash = await bcrypt.hash(password || "Admin@123", 10);
    const branch = branchId ? await prisma.branch.findUnique({ where: { id: branchId } }) : null;

    // Auto-generate Customer ID (CUS000001 format) for customers
    let generatedCustomerId: string | undefined = undefined;
    if (assignedRole === "CUSTOMER") {
      const lastCustomer = await prisma.user.findFirst({
        where: { customerId: { not: null } },
        orderBy: { customerId: "desc" },
        select: { customerId: true },
      });
      let nextNum = 1;
      if (lastCustomer?.customerId) {
        const match = lastCustomer.customerId.match(/CUS(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      generatedCustomerId = `CUS${String(nextNum).padStart(6, "0")}`;
    }

    // Auto-generate Employee ID (EMP000001 format) for non-customer roles
    let generatedEmployeeId: string | undefined = undefined;
    if (assignedRole !== "CUSTOMER") {
      const lastEmployee = await prisma.user.findFirst({
        where: { employeeId: { not: null } },
        orderBy: { employeeId: "desc" },
        select: { employeeId: true },
      });
      let nextNum = 1;
      if (lastEmployee?.employeeId) {
        const match = lastEmployee.employeeId.match(/EMP(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      generatedEmployeeId = `EMP${String(nextNum).padStart(6, "0")}`;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        roleId: assignedRole,
        branchId: branchId || null,
        branchName: branch ? branch.name : "Head Office",
        reportsToId: reportsToId || null,
        assignedEmployeeId: assignedRole === "CUSTOMER" ? (reportsToId || null) : null,
        customerType: assignedRole === "CUSTOMER" ? "ENTERPRISE" : "STANDARD",
        status: initialStatus,
        isActive: initialStatus === "ACTIVE",
        customerId: generatedCustomerId || null,
        employeeId: generatedEmployeeId || null,
        gstNumber: gstNumber || "",
        companyName: companyName || (assignedRole === "CUSTOMER" ? name : ""),
        address: address || "",
      },
      include: { role: true, branch: true, reportsTo: true }
    });

    return NextResponse.json({
      success: true,
      user,
      message: initialStatus === "PENDING" ? "Customer account created and pending manager approval." : "Account created successfully."
    });
  } catch (err: any) {
    console.error("POST /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}

// PUT /api/users - Edit user details, reset password, change role, manager, branch, status, APPROVE/REJECT customer
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, phone, roleId, branchId, reportsToId, status, password, action } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (branchId !== undefined) {
      updateData.branchId = branchId || null;
      if (branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (branch) updateData.branchName = branch.name;
      }
    }
    if (reportsToId !== undefined) {
      updateData.reportsToId = reportsToId || null;
      if (roleId === "CUSTOMER" || (!roleId && updateData.roleId === "CUSTOMER")) {
        updateData.assignedEmployeeId = reportsToId || null;
      }
    }

    // Phase 4: Handle Approve / Reject actions
    if (action === "APPROVE") {
      updateData.status = "ACTIVE";
      updateData.isActive = true;
    } else if (action === "REJECT") {
      updateData.status = "REJECTED";
      updateData.isActive = false;
    } else if (status !== undefined) {
      updateData.status = status;
      updateData.isActive = status === "ACTIVE";
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true, branch: true, reportsTo: true }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error("PUT /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}
