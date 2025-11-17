import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "superadmin") {
    redirect("/superadmin");
  }

  if (session.role === "company_admin") {
    redirect("/empresa");
  }

  redirect("/trabajador");
}
