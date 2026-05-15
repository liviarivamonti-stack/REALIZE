import {
  useListNotifications,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Phone,
  DollarSign,
  RefreshCw,
  Bell,
  BellOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Notif = {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  client_nome: string | null;
  lida: boolean;
  createdAt: string;
};

function notifIcon(tipo: string) {
  switch (tipo) {
    case "pagamento_confirmado": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "atraso_novo": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "cliente_critico": return <Flame className="h-4 w-4 text-red-500" />;
    case "risco_alterado": return <ShieldAlert className="h-4 w-4 text-orange-500" />;
    case "follow_up": return <Phone className="h-4 w-4 text-blue-500" />;
    case "vencimento_proximo": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case "renegociacao": return <RefreshCw className="h-4 w-4 text-purple-500" />;
    case "cobranca_alerta": return <ShieldAlert className="h-4 w-4 text-destructive" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function notifBg(tipo: string, lida: boolean) {
  if (lida) return "bg-card";
  switch (tipo) {
    case "pagamento_confirmado": return "bg-green-50 dark:bg-green-900/10";
    case "atraso_novo":
    case "vencimento_proximo": return "bg-amber-50 dark:bg-amber-900/10";
    case "cliente_critico":
    case "cobranca_alerta": return "bg-red-50 dark:bg-red-900/10";
    default: return "bg-blue-50 dark:bg-blue-900/10";
  }
}

export default function Notificacoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: notifs, isLoading } = useListNotifications({ limit: 100 });
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifs?.filter(n => !n.lida).length ?? 0;

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Todas as notificações marcadas como lidas" });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 pt-4">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 max-w-lg mx-auto">
      {/* Header actions */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo lido"}
        </span>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending} className="text-xs">
            {markAllRead.isPending ? "Marcando..." : "Marcar tudo como lido"}
          </Button>
        )}
      </div>

      {/* List */}
      <div className="px-4 space-y-1.5">
        {!notifs || notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-1">Tudo tranquilo por aqui.</p>
            </div>
          </div>
        ) : (
          (notifs as Notif[]).map(n => (
            <div
              key={n.id}
              className={cn(
                "rounded-xl border p-3 flex items-start gap-3 transition-colors",
                notifBg(n.tipo, n.lida),
                !n.lida && "border-primary/20"
              )}
            >
              <div className="mt-0.5 h-8 w-8 rounded-full bg-background border flex items-center justify-center flex-shrink-0">
                {notifIcon(n.tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm font-semibold leading-snug", !n.lida ? "text-foreground" : "text-muted-foreground")}>
                    {n.titulo}
                  </p>
                  {!n.lida && (
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
