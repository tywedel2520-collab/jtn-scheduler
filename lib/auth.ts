import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "session_user";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Role = "admin" | "client";

export type CurrentUser = {
  role: Role;
  id: string;
  email: string;
  name: string;
  customerId?: string | null;
};

type AdminRow = {
  id: string;
  email: string;
  name: string;
};

export type ClientAccountRow = {
  id: string;
  email: string;
  name: string;
  password: string;
  customerId: string | null;
};

export async function ensureClientAccountsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientAccount" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "customerId" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function findClientByEmail(email: string): Promise<ClientAccountRow | null> {
  await ensureClientAccountsTable();
  const rows = await prisma.$queryRawUnsafe<ClientAccountRow[]>(
    'SELECT id, email, name, password, "customerId" FROM "ClientAccount" WHERE email = $1 LIMIT 1',
    email
  );
  return rows[0] ?? null;
}

async function findClientById(id: string): Promise<ClientAccountRow | null> {
  await ensureClientAccountsTable();
  const rows = await prisma.$queryRawUnsafe<ClientAccountRow[]>(
    'SELECT id, email, name, password, "customerId" FROM "ClientAccount" WHERE id = $1 LIMIT 1',
    id
  );
  return rows[0] ?? null;
}

async function findAdminById(id: string): Promise<AdminRow | null> {
  try {
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return null;
    return { id: admin.id, email: admin.email, name: admin.name };
  } catch {
    const rows = await prisma.$queryRawUnsafe<AdminRow[]>(
      'SELECT id, email, name FROM "Admin" WHERE id = $1 LIMIT 1',
      id
    );
    return rows[0] ?? null;
  }
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/",
};

export function setSessionOnResponse(
  response: { cookies: { set: (name: string, value: string, opts: object) => void } },
  input: { role: Role; userId: string }
) {
  const sessionId = `${input.role}:${input.userId}:${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  response.cookies.set(SESSION_COOKIE, sessionId, COOKIE_OPTIONS);
}

export async function createSession(input: { role: Role; userId: string }) {
  const sessionId = `${input.role}:${input.userId}:${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, COOKIE_OPTIONS);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  // New format: `${role}:${userId}:...`
  const parts = session.split(":");
  if (parts.length >= 2) {
    const role = parts[0];
    const userId = parts[1];
    if (role === "admin") {
      const admin = await findAdminById(userId);
      if (!admin) return null;
      return {
        role: "admin",
        id: admin.id,
        email: admin.email,
        name: admin.name,
      };
    }
    if (role === "client") {
      const client = await findClientById(userId);
      if (!client) return null;
      return {
        role: "client",
        id: client.id,
        email: client.email,
        name: client.name,
        customerId: client.customerId,
      };
    }
  }

  return null;
}

export function deleteSessionFromResponse(
  response: { cookies: { delete: (name: string) => void } }
) {
  response.cookies.delete(SESSION_COOKIE);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
