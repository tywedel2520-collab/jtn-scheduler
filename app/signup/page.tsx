import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SignupForm from "@/components/SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/dashboard" : "/client");

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-100 px-4 py-8">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </main>
  );
}

