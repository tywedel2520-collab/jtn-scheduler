export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const { setSessionOnResponse, ensureClientAccountsTable, findClientByEmail } = await import("@/lib/auth");

    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existingAdmin = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM "Admin" WHERE email = $1 LIMIT 1',
      email
    );
    if (existingAdmin[0]) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }

    const existingClient = await findClientByEmail(email);
    if (existingClient) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }

    let customer = await prisma.customer.findFirst({ where: { email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name, email },
      });
    }

    await ensureClientAccountsTable();
    const hashed = await bcrypt.hash(password, 10);
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "ClientAccount" (id, email, name, password, "customerId") VALUES ($1, $2, $3, $4, $5)',
      id,
      email,
      name,
      hashed,
      customer.id
    );

    const res = NextResponse.json({ success: true, role: "client" });
    setSessionOnResponse(res, { role: "client", userId: id });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SIGNUP ERROR:", err);
    return NextResponse.json(
      { error: "Signup failed", details: message },
      { status: 500 }
    );
  }
}

