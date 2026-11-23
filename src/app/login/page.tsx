import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in — CivicFix" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "authority" ? "/?view=authority" : "/");
  return <LoginForm />;
}
