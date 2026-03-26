export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function GET() {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { name, email, phone, address } = body ?? {};

    const normalizedName = typeof name === "string" ? normalizeName(name) : "";
    if (!normalizedName) {
      return NextResponse.json({ error: "Customer name required" }, { status: 400 });
    }

    const cleanedEmail =
      typeof email === "string" && email.trim().length > 0 ? email.trim() : null;
    const cleanedPhone =
      typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null;
    const cleanedAddress =
      typeof address === "string" && address.trim().length > 0 ? address.trim() : null;

    // De-duplicate by normalized case-insensitive name.
    const existing = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        shareToken: string;
      }>
    >(
      'SELECT id, name, email, phone, address, "shareToken" as "shareToken" FROM "Customer" WHERE lower(trim(name)) = lower(trim($1)) LIMIT 1',
      normalizedName
    );

    if (existing[0]) {
      // If optional fields are provided and existing record is missing them, fill them in.
      const shouldPatchEmail = !existing[0].email && cleanedEmail;
      const shouldPatchPhone = !existing[0].phone && cleanedPhone;
      const shouldPatchAddress = !existing[0].address && cleanedAddress;

      if (shouldPatchEmail || shouldPatchPhone || shouldPatchAddress) {
        await prisma.customer.update({
          where: { id: existing[0].id },
          data: {
            ...(shouldPatchEmail ? { email: cleanedEmail } : {}),
            ...(shouldPatchPhone ? { phone: cleanedPhone } : {}),
            ...(shouldPatchAddress ? { address: cleanedAddress } : {}),
          },
        });
        const refreshed = await prisma.customer.findUnique({ where: { id: existing[0].id } });
        return NextResponse.json(refreshed);
      }
      return NextResponse.json(existing[0]);
    }

    const customer = await prisma.customer.create({
      data: {
        name: normalizedName,
        email: cleanedEmail,
        phone: cleanedPhone,
        address: cleanedAddress,
        shareToken: uuidv4().replace(/-/g, "").slice(0, 12),
      },
    });
    return NextResponse.json(customer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("CUSTOMER CREATE ERROR:", err);
    return NextResponse.json(
      { error: "Customer create failed", details: message },
      { status: 500 }
    );
  }
}
