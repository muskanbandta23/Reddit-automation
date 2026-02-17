import { getLatestScanResult } from "@/app/lib/storage";
import DashboardClient from "@/app/components/DashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  let data = null;

  try {
    data = await getLatestScanResult();
  } catch (error) {
    console.error("Failed to load scan results:", error);
  }

  return <DashboardClient initialData={data} />;
}
