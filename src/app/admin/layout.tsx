import { AppShell } from "@/components/layout/AppShell";
import { headerUserForUser, requireAreaAccess } from "@/lib/server/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAreaAccess("administrador");
  return <AppShell role="administrador" user={headerUserForUser(user)}>{children}</AppShell>;
}
