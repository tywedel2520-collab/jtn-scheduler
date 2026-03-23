export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { createSession, ensureClientAccountsTable, findClientByEmail } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existingAdmin = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM "Admin" WHERE email = ? LIMIT 1',
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
      'INSERT INTO "ClientAccount" (id, email, name, password, customerId) VALUES (?, ?, ?, ?, ?)',
      id,
      email,
      name,
      hashed,
      customer.id
    );

    await createSession({ role: "client", userId: id });
    return NextResponse.json({ success: true, role: "client" });
  } catch {
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}

