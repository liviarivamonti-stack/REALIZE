import { Link, useLocation } from "wouter";
import { Home, Users, Wallet, Target, User, Bell } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useListNotifications } from "@workspace/api-client-react";

function NavItem({ href, icon: Icon, label, exact = true }: { href: string; icon: any; label: string; exact?: boolean }) {
  const [location] = useLocation();
  const isActive = exact ? location === href : location.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full text-xs gap-1 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

function TopHeader() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { data: notifs } = useListNotifications({ lida: false, limit: 99 });
  const unread = notifs?.length ?? 0;

  const titles: Record<string, string> = {
    "/": "Início",
    "/clientes": "Clientes",
    "/cobranca": "Cobrança",
    "/metas": "Metas",
    "/perfil": "Perfil",
    "/notificacoes": "Notificações",
  };

  const title = Object.entries(titles).find(([path]) =>
    path === "/" ? location === "/" : location.startsWith(path)
  )?.[1] ?? "REALIZE CRM";

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-sm border-b border-border z-50 flex items-center justify-between px-4">
      <span className="font-bold text-base text-foreground">{title}</span>
      <Link href="/notificacoes" className="relative p-1.5 rounded-lg hover:bg-muted transition-colors">
        <Bell className="h-5 w-5 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[10px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </header>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const papel = user?.papel ?? "vendedor";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <TopHeader />
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 pb-safe z-50">
        <NavItem href="/" icon={Home} label="Início" exact={true} />
        {(papel === "lider" || papel === "vendedor") && (
          <NavItem href="/clientes" icon={Users} label="Clientes" exact={false} />
        )}
        {(papel === "lider" || papel === "cobrador") && (
          <NavItem href="/cobranca" icon={Wallet} label="Cobrança" exact={true} />
        )}
        {(papel === "lider" || papel === "vendedor") && (
          <NavItem href="/metas" icon={Target} label="Metas" exact={true} />
        )}
        <NavItem href="/perfil" icon={User} label="Perfil" exact={true} />
      </nav>
    </div>
  );
}
