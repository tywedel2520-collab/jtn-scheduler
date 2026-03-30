export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

/** Legacy URL; canonical client view is `/client/[token]`. */
export default async function LegacySharePage({ params }: Props) {
  const { token } = await params;
  redirect(`/client/${encodeURIComponent(token)}`);
}
