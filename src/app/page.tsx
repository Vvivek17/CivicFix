import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { reports, preferences } = await getDashboardData(user);
  return <Dashboard initialReports={reports} initialPreferences={preferences} user={user} />;
}
