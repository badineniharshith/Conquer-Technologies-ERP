import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeData } from "@/lib/serialize";

export const dynamic = "force-dynamic";

// GET /api/users - Fetch hierarchy tree or users list from public.users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const mode = searchParams.get("mode"); // "tree" or "list"

    let currentUser = null;
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

    let allBranches: any[] = [];
    try {
      allBranches = await prisma.branch.findMany();
    } catch (e) {}

    const mappedUsers = allUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roleId: u.roleId,
      branchId: u.branchId,
      branchName: u.branchName || u.branch?.name || "Head Office",
      status: u.status,
      isActive: u.isActive,
      customerType: u.customerType,
      employeeId: u.employeeId || u.id,
      department: u.department || "Operations",
      designation: u.designation || "Operations Executive",
      reportsToId: u.reportsToId,
      reportsToName: u.reportsTo?.name || null
    }));

    if (mode === "tree") {
      const buildTree = (parentId: string | null = null): any[] => {
        return mappedUsers
          .filter(u => u.roleId !== "CUSTOMER")
          .filter(u => (parentId === null ? (!u.reportsToId || u.id === "u-superadmin") : u.reportsToId === parentId))
          .filter((u, index, self) => self.findIndex(t => t.id === u.id) === index)
          .map(u => {
            const kids = parentId === u.id ? [] : buildTree(u.id);
            return {
              ...u,
              children: kids,
              subordinates: kids
            };
          });
      };

      const tree = buildTree(null);
      return NextResponse.json({
        success: true,
        currentUser: currentUser ? serializeData(currentUser) : userId,
        tree: tree,
        branches: allBranches
      });
    }

    return NextResponse.json({
      success: true,
      users: mappedUsers,
      branches: allBranches
    });
  } catch (err: any) {
    console.error("GET /api/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch users" }, { status: 500 });
  }
}
