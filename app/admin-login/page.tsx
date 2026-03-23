import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminLoginForm from "@/components/AdminLoginForm";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect("/dashboard");

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-100 px-4 py-8">
      <div className="w-full max-w-md">
        <AdminLoginForm currentRole={user?.role ?? null} />
      </div>
    </main>
  );
}

