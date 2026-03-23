import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, email, phone, address } = body;

  const normalizedName = typeof name === "string" ? normalizeName(name) : "";
  if (!normalizedName) {
    return NextResponse.json(
      { error: "Customer name required" },
      { status: 400 }
    );
  }

  // De-duplicate by normalized case-insensitive name.
  const existing = await prisma.$queryRawUnsafe<
    Array<{ id: string; name: string; email: string | null; phone: string | null; address: string | null; shareToken: string }>
  >(
    'SELECT id, name, email, phone, address, shareToken FROM "Customer" WHERE lower(trim(name)) = lower(trim(?)) LIMIT 1',
    normalizedName
  );

  if (existing[0]) {
    // If optional fields are provided and existing record is missing them, fill them in.
    const shouldPatchEmail = !existing[0].email && typeof email === "string" && email.trim().length > 0;
    const shouldPatchPhone = !existing[0].phone && typeof phone === "string" && phone.trim().length > 0;
    const shouldPatchAddress = !existing[0].address && typeof address === "string" && address.trim().length > 0;

    if (shouldPatchEmail || shouldPatchPhone || shouldPatchAddress) {
      await prisma.customer.update({
        where: { id: existing[0].id },
        data: {
          ...(shouldPatchEmail ? { email: email.trim() } : {}),
          ...(shouldPatchPhone ? { phone: phone.trim() } : {}),
          ...(shouldPatchAddress ? { address: address.trim() } : {}),
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
      email: typeof email === "string" && email.trim().length > 0 ? email.trim() : null,
      phone: typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null,
      address: typeof address === "string" && address.trim().length > 0 ? address.trim() : null,
      shareToken: uuidv4().replace(/-/g, "").slice(0, 12),
    },
  });
  return NextResponse.json(customer);
}
