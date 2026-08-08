import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/users - Fetch hierarchy tree or users list from public.users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const mode = searchParams.get("mode"); // "tree" or "list"

    let currentUser: any = null;
    if (userId) {
      try {
        currentUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { branch: true, role: true, reportsTo: true, subordinates: true }
        });
      } catch (e) {}
    }

    let allUsers: any[] = [];
    try {
      allUsers = await prisma.user.findMany({
        include: {
          branch: true,
          role: true,
          reportsTo: true,
          subordinates: true
        },
        orderBy: { createdAt: "asc" }
      });
    } catch (e) {
      allUsers = [];
    }

    let allCustomers: any[] = [];
    try {
      allCustomers = await prisma.customer.findMany({
        take: 500,
        orderBy: { createdAt: "desc" }
      });
    } catch (e) {}

    let allBranches: any[] = [];
    try {
      allBranches = await prisma.branch.findMany();
    } catch (e) {}

    let allRoles: any[] = [];
    try {
      allRoles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    } catch (e) {}

    // Ensure CUSTOMER role is present in allRoles if missing
    if (!allRoles.some(r => r.name === "CUSTOMER" || r.id === "CUSTOMER")) {
      allRoles.push({ id: "CUSTOMER", name: "Customer", code: "CUSTOMER" });
    }

    const mappedUsers = allUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roleId: u.roleId,
      roleName: u.role?.name || u.roleId,
      role: u.role ? { id: u.role.id, name: u.role.name } : { id: u.roleId, name: u.roleId },
      branchId: u.branchId,
      branchName: u.branchName || u.branch?.name || "Head Office",
      branch: u.branch ? { id: u.branch.id, name: u.branch.name } : null,
      status: u.status || (u.isActive ? "ACTIVE" : "PENDING"),
      isActive: u.isActive,
      customerType: u.customerType,
      employeeId: u.employeeId || null,
      customerId: u.customerId || null,
      department: u.department || null,
      designation: u.designation || null,
      city: u.city || null,
      state: u.state || null,
      reportsToId: u.reportsToId,
      reportsToName: u.reportsTo?.name || null,
      reportsTo: u.reportsTo ? { id: u.reportsTo.id, name: u.reportsTo.name, email: u.reportsTo.email, employeeId: u.reportsTo.employeeId } : null,
    }));

    // Append customer accounts mapped as User records
    const mappedCustomers = allCustomers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email || `${c.id.substring(0, 8)}@customer.com`,
      phone: c.phone || "N/A",
      roleId: "CUSTOMER",
      roleName: "Customer",
      role: { id: "CUSTOMER", name: "Customer" },
      branchId: c.branchId || null,
      branchName: c.city ? `${c.city} Branch` : "Commercial Branch",
      branch: null,
      status: c.status || "ACTIVE",
      isActive: c.status === "ACTIVE",
      customerType: c.customerType || "ENTERPRISE",
      employeeId: null,
      customerId: c.customerCode || c.id,
      department: "Customer Account",
      designation: "Enterprise Client",
      city: c.city || null,
      state: c.state || null,
      reportsToId: null,
      reportsToName: null,
      reportsTo: null
    }));

    const combinedUsers = [...mappedUsers, ...mappedCustomers];

    const isFullAdmin =
      !currentUser ||
      currentUser.role?.name === "SUPER_ADMIN" ||
      currentUser.roleId === "SUPER_ADMIN" ||
      currentUser.role?.name === "ADMIN" ||
      currentUser.roleId === "ADMIN" ||
      currentUser.role?.name === "MANAGING_DIRECTOR";

    let scopedUsers = mappedUsers;
    if (!isFullAdmin && currentUser) {
      // Find all downline subordinates of currentUser recursively (cycle-safe BFS)
      const getDownlineIds = (rootId: string): string[] => {
        const result: string[] = [rootId];
        const queue: string[] = [rootId];
        const visited = new Set<string>([rootId]);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          const children = mappedUsers.filter(u => u.reportsToId === curr);
          for (const child of children) {
            if (!visited.has(child.id)) {
              visited.add(child.id);
              result.push(child.id);
              queue.push(child.id);
            }
          }
        }
        return result;
      };

      const allowedIds = getDownlineIds(currentUser.id);
      scopedUsers = mappedUsers.filter(u => allowedIds.includes(u.id));
    }

    if (mode === "tree") {
      // Build tree excluding customers
      const nonCustomerUsers = scopedUsers.filter(u => u.roleName !== "CUSTOMER");

      const buildTree = (parentId: string | null = null): any[] => {
        const roots = nonCustomerUsers.filter(u => {
          if (parentId === null) {
            // Top-level: no manager, or for non-admin the user themselves
            if (isFullAdmin) return !u.reportsToId;
            return u.id === currentUser?.id;
          }
          return u.reportsToId === parentId;
        });

        return roots
          .filter((u, index, self) => self.findIndex(t => t.id === u.id) === index)
          .map(u => {
            const kids = buildTree(u.id);
            return {
              ...u,
              children: kids,
              subordinates: kids
            };
          });
      };

      let treeRoots = buildTree(null);

      // Fallback: if no roots found for non-admin (they might report to someone outside their scope)
      if (treeRoots.length === 0 && !isFullAdmin && currentUser) {
        const rootUserNode = nonCustomerUsers.find(u => u.id === currentUser.id);
        if (rootUserNode) {
          const getKids = (pid: string): any[] => {
            return nonCustomerUsers
              .filter(u => u.reportsToId === pid)
              .map(u => ({ ...u, children: getKids(u.id), subordinates: getKids(u.id) }));
          };
          treeRoots = [{ ...rootUserNode, children: getKids(rootUserNode.id), subordinates: getKids(rootUserNode.id) }];
        }
      }

      return NextResponse.json(serializeData({
        success: true,
        currentUser: currentUser ? serializeData(currentUser) : userId,
        tree: treeRoots,
        branches: allBranches
      }));
    }

    return NextResponse.json(serializeData({
      success: true,
      users: scopedUsers,
      branches: allBranches,
      roles: allRoles
    }));
  } catch (err: any) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - Create a new user account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, roleId, branchId, reportsToId, status, password } = body;

    if (!name || !email || !roleId) {
      return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email address is already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password || "Admin@123", 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        roleId,
        branchId: branchId || null,
        reportsToId: reportsToId || null,
        status: status || "ACTIVE",
        isActive: (status || "ACTIVE") === "ACTIVE",
        passwordHash
      },
      include: { role: true, branch: true, reportsTo: true }
    });

    return NextResponse.json({ success: true, user: serializeData(newUser) });
  } catch (err: any) {
    console.error("POST /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}

// PUT /api/users - Update an existing user account
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, phone, roleId, branchId, reportsToId, status, password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If email changed, check for duplicate
    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json({ error: "Email address is already in use by another account" }, { status: 409 });
      }
    }

    const updateData: any = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(roleId && { roleId }),
      ...(branchId !== undefined && { branchId: branchId || null }),
      ...(reportsToId !== undefined && { reportsToId: reportsToId || null }),
      ...(status && { status, isActive: status === "ACTIVE" }),
    };

    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true, branch: true, reportsTo: true }
    });

    return NextResponse.json({ success: true, user: serializeData(updated) });
  } catch (err: any) {
    console.error("PUT /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users?id=xxx - Delete a user account
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Clean up related records first
    await prisma.notification.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.stockReservation.deleteMany({ where: { customerId: id } }).catch(() => {});

    // Update subordinates to remove their reportsToId
    await prisma.user.updateMany({
      where: { reportsToId: id },
      data: { reportsToId: null }
    }).catch(() => {});

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    console.error("DELETE /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete user" }, { status: 500 });
  }
}
