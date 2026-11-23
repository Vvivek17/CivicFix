import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  try {
    const { reports, preferences } = await getDashboardData(user);
    return <Dashboard initialReports={reports} initialPreferences={preferences} user={user} />;
  } catch (error) {
    console.error("Dashboard data load error:", error);
    return (
      <Dashboard
        initialReports={[]}
        initialPreferences={{
          name: user.name,
          email: user.email,
          neighborhood: "Koramangala",
          notifications: true,
          following: [],
          voted: [],
        }}
        user={user}
      />
    );
  }
}
