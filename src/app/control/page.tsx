import { Metadata } from "next";
import ControlDashboard from "@/components/yzihub/ControlDashboard";
import { getControlDashboard } from "@/lib/control/queries";
import { mockControlDashboard } from "@/lib/control/mock-data";

export const metadata: Metadata = {
  title: "YZI CONTROL — Admin Global",
};

export default async function ControlPage() {
  const data = await getControlDashboard().catch(() => null);
  const dashboardData = data ?? mockControlDashboard;

  return <ControlDashboard data={dashboardData} />;
}
