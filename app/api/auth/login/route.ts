import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, findClientByEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AdminWithPassword = {
  id: string;
  email: string;
  name: string;
  password: string;
};

async function findAdminByEmail(email: string): Promise<AdminWithPassword | null> {
  const adminDelegate = (prisma as unknown as { admin?: { findUnique: Function } }).admin;
  if (adminDelegate?.findUnique) {
    const admin = await adminDelegate.findUnique({ where: { email } });
    if (!admin) return null;
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      password: admin.password,
    };
  }

  const rows = await prisma.$queryRawUnsafe<AdminWithPassword[]>(
    'SELECT id, email, name, password FROM "Admin" WHERE email = ? LIMIT 1',
    email
  );
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Role is resolved server-side. Admin stays hidden in UI.
    const admin = await findAdminByEmail(email);
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      await createSession({ role: "admin", userId: admin.id });
      return NextResponse.json({ success: true, role: "admin" });
    }

    const client = await findClientByEmail(email);
    if (client) {
      const valid = await bcrypt.compare(password, client.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      await createSession({ role: "client", userId: client.id });
      return NextResponse.json({ success: true, role: "client" });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
