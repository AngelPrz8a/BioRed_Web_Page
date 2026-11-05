import { AppShell } from "@/components/layout/AppShell";
import { getSessionUser, headerUserForUser, roleForUser } from "@/lib/server/authorization";

export default async function PublicoLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <AppShell
      role={user ? roleForUser(user) : "particular"}
      user={user ? headerUserForUser(user) : undefined}
    >
      {children}
    </AppShell>
  );
}
