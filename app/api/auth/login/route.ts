export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";



type AdminWithPassword = {
  id: string;
  email: string;
  name: string;
  password: string;
};

export async function POST(request: Request) {
  try {
    const { setSessionOnResponse, findClientByEmail } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");

    async function findAdminByEmail(email: string): Promise<AdminWithPassword | null> {
      try {
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) return null;
        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          password: admin.password,
        };
      } catch {
        const rows = await prisma.$queryRawUnsafe<AdminWithPassword[]>(
          'SELECT id, email, name, password FROM "Admin" WHERE email = $1 LIMIT 1',
          email
        );
        return rows[0] ?? null;
      }
    }

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
      if (!admin.password) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const res = NextResponse.json({ success: true, role: "admin" });
      setSessionOnResponse(res, { role: "admin", userId: admin.id });
      return res;
    }

    const client = await findClientByEmail(email);
    if (client) {
      if (!client.password) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const valid = await bcrypt.compare(password, client.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const res = NextResponse.json({ success: true, role: "client" });
      setSessionOnResponse(res, { role: "client", userId: client.id });
      return res;
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { error: "Server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}