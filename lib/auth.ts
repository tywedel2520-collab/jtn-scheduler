import { cookies } from "next/headers";
import { prisma } from "./db";
import { createHmac, timingSafeEqual } from "crypto";

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
  try {
    const rows = await prisma.$queryRawUnsafe<ClientAccountRow[]>(
      'SELECT id, email, name, password, "customerId" FROM "ClientAccount" WHERE email = $1 LIMIT 1',
      email
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function findClientById(id: string): Promise<ClientAccountRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<ClientAccountRow[]>(
      'SELECT id, email, name, password, "customerId" FROM "ClientAccount" WHERE id = $1 LIMIT 1',
      id
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
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

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64").toString("utf8");
}

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "dev-session-secret";
}

function makeSessionToken(input: { role: Role; userId: string }) {
  const payload = JSON.stringify({
    role: input.role,
    userId: input.userId,
    iat: Date.now(),
  });
  const payloadB64 = base64UrlEncode(payload);
  const sigHex = createHmac("sha256", getSessionSecret()).update(payloadB64).digest("hex");
  return `${payloadB64}.${sigHex}`;
}

function verifySessionToken(token: string): { role: Role; userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigHex] = parts;
  if (!payloadB64 || !sigHex) return null;

  const expectedSigHex = createHmac("sha256", getSessionSecret()).update(payloadB64).digest("hex");
  if (sigHex.length !== expectedSigHex.length) return null;

  const sigBuf = Buffer.from(sigHex, "hex");
  const expectedBuf = Buffer.from(expectedSigHex, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payloadStr = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadStr) as { role?: unknown; userId?: unknown };
    if (payload.role !== "admin" && payload.role !== "client") return null;
    if (typeof payload.userId !== "string" || payload.userId.length === 0) return null;
    return { role: payload.role, userId: payload.userId };
  } catch {
    return null;
  }
}

export function setSessionOnResponse(
  response: { cookies: { set: (name: string, value: string, opts: object) => void } },
  input: { role: Role; userId: string }
) {
  const token = makeSessionToken(input);
  response.cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
}

export async function createSession(input: { role: Role; userId: string }) {
  const token = makeSessionToken(input);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let decoded = verifySessionToken(token);
  // Back-compat: accept the legacy unsigned `${role}:${userId}:...` format.
  if (!decoded && token.includes(":")) {
    const parts = token.split(":");
    if (parts.length >= 2) {
      const role = parts[0];
      const userId = parts[1];
      if (role === "admin" || role === "client") {
        decoded = { role, userId };
      }
    }
  }
  if (!decoded) return null;

  if (decoded.role === "admin") {
    const admin = await findAdminById(decoded.userId);
    if (!admin) return null;
    return {
      role: "admin",
      id: admin.id,
      email: admin.email,
      name: admin.name,
    };
  }

  const client = await findClientById(decoded.userId);
  if (!client) return null;
  return {
    role: "client",
    id: client.id,
    email: client.email,
    name: client.name,
    customerId: client.customerId,
  };
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
