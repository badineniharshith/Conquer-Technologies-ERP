import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, username, domain, profession, designation, password, confirmPassword, status } = body;

    if (!name || (!email && !username)) {
      return NextResponse.json({ error: "Name and Email are required." }, { status: 400 });
    }

    if (password && confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    // Check maximum 5 users limit
    let userCount = 0;
    try {
      const res: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM users WHERE company_id = 'C000028' OR role = 'customer'`
      );
      userCount = res[0]?.count || 0;
    } catch {
      userCount = 0;
    }

    if (userCount >= 5) {
      return NextResponse.json(
        { error: "Maximum corporate user limit reached (5/5 users allocated for this account)." },
        { status: 400 }
      );
    }

    // Format full email with company domain tag (e.g. @oracle.in or @acceldata.io)
    const companyDomain = domain ? domain.replace(/^@/, '') : "acceldata.io";
    let fullEmail = email || username || "";
    if (!fullEmail.includes("@")) {
      fullEmail = `${fullEmail.trim()}@${companyDomain}`;
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("Password@123", 10);
    const userStatus = status || "Active";

    // Insert user into PostgreSQL users table on Neon DB
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO users (name, email, password_hash, profession, designation, role, company_id, status)
         VALUES ($1, $2, $3, $4, $5, 'customer', 'C000028', $6)
         ON CONFLICT (email) DO UPDATE SET 
           name = EXCLUDED.name,
           profession = EXCLUDED.profession,
           designation = EXCLUDED.designation,
           status = EXCLUDED.status;`,
        name,
        fullEmail,
        passwordHash,
        profession || "Engineering",
        designation || "Software Engineer",
        userStatus
      );
    } catch (e) {
      // Fallback insertion into prisma.user
      try {
        const customerRole = await prisma.role.findFirst({ where: { name: "CUSTOMER" } });
        await prisma.user.create({
          data: {
            name,
            email: fullEmail,
            passwordHash,
            department: profession || "Engineering",
            designation: designation || "Software Engineer",
            roleId: customerRole?.id || "CUSTOMER",
            status: userStatus.toUpperCase()
          }
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to create user." }, { status: 500 });
      }
    }

    revalidatePath("/assign-users");
    return NextResponse.json({
      success: true,
      message: `User ${name} (${fullEmail}) created successfully!`,
      user: { name, email: fullEmail, profession, designation, status: userStatus }
    });
  } catch (err: any) {
    console.error("POST /api/users/create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create user." }, { status: 500 });
  }
}
