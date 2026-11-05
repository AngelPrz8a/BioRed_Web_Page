import { ROLES, type Role, type SessionUser } from "@/lib/navigation";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ShellProvider } from "./ShellProvider";
import { Sidebar } from "./Sidebar";

type AppShellProps = {
  role: Role;
  user?: SessionUser;
  children: React.ReactNode;
};

/** Estructura común a los 4 roles: header + menú lateral + contenido + footer. */
export function AppShell({ role, user, children }: AppShellProps) {
  const { basePath } = ROLES[role];

  return (
    <ShellProvider>
      <div className="flex min-h-dvh flex-col bg-bg">
        <Header user={user} homeHref={basePath || "/"} />

        <div className="flex flex-1 items-stretch">
          <Sidebar role={role} />

          <main id="contenido" className="min-w-0 flex-1 px-4 py-8 text-left sm:px-8">
            {children}
          </main>
        </div>

        <Footer />
      </div>
    </ShellProvider>
  );
}
