import { useAuth } from "@/lib/auth-context";
import {
  useGetDashboardSummary,
  useListTasks,
  useGetRanking,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { DollarSign, CheckSquare, Target, Activity, Users, AlertCircle, Crown, Medal, Award } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function PodiumCard({ ranking }: { ranking: any[] }) {
  const top3 = ranking.slice(0, 3);
  if (top3.length === 0) return null;

  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = ["h-16", "h-24", "h-12"];
  const podiumColors = [
    "bg-blue-400/30 border-blue-400/50",
    "bg-amber-400/30 border-amber-400/50",
    "bg-orange-400/20 border-orange-400/30",
  ];
  const origPos = order.map(e => e ? top3.indexOf(e) : -1);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white shadow-lg shadow-blue-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5 text-amber-300" />
        <span className="font-bold text-sm uppercase tracking-wider opacity-90">Ranking do Mês</span>
      </div>

      <div className="flex items-end justify-center gap-3 mb-2">
        {order.map((entry, i) => {
          if (!entry) return <div key={i} className="w-20" />;
          const isFirst = origPos[i] === 0;
          const ht = heights[i];
          return (
            <div key={entry.user_id} className="flex flex-col items-center gap-1">
              {isFirst && (
                <Crown className="h-5 w-5 text-amber-300 animate-pulse" />
              )}
              {!isFirst && origPos[i] === 1 && <Medal className="h-4 w-4 text-slate-300" />}
              {!isFirst && origPos[i] === 2 && <Award className="h-4 w-4 text-orange-300" />}
              <div
                className={cn(
                  "w-20 rounded-t-xl border flex flex-col items-center justify-end pb-2",
                  ht,
                  podiumColors[origPos[i]] ?? "bg-white/10 border-white/20",
                  isFirst && "shadow-lg shadow-amber-400/20"
                )}
              >
                <span className="text-xs font-bold">{entry.posicao}º</span>
              </div>
              <p className="text-xs font-semibold text-white/90 text-center max-w-[80px] truncate">
                {entry.nome.split(" ")[0]}
              </p>
              <p className="text-[10px] text-blue-200">{formatCurrency(entry.total_vendas)}</p>
            </div>
          );
        })}
      </div>

      {ranking.slice(3).map(entry => (
        <div key={entry.user_id} className="flex items-center justify-between py-1.5 border-t border-white/10 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-300 w-5 text-center font-medium">{entry.posicao}º</span>
            <span className="text-white/80">{entry.nome.split(" ")[0]}</span>
          </div>
          <span className="text-blue-200">{formatCurrency(entry.total_vendas)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: tasks } = useListTasks({ concluido: false });
  const { data: ranking, isLoading: rankingLoading } = useGetRanking({});

  const papel = user?.papel ?? "vendedor";
  const showRanking = papel === "lider" || papel === "vendedor";

  if (summaryLoading) {
    return (
      <div className="p-4 space-y-4 pt-16">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const pendingTasksCount = tasks?.length ?? 0;

  return (
    <div className="p-4 pb-20 space-y-5 pt-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Olá, {user?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-xs text-muted-foreground">Resumo de hoje</p>
      </div>

      {/* 1. Comissão do mês */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-lg shadow-primary/20">
        <div className="flex items-center gap-2 mb-1 opacity-80">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-medium">Comissão do mês</span>
        </div>
        <div className="text-3xl font-bold">
          {formatCurrency((summary?.comissao_mes ?? 0) + (summary?.bonus ?? 0))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm opacity-80">
          <span>Comissão: {formatCurrency(summary?.comissao_mes ?? 0)}</span>
          {(summary?.bonus ?? 0) > 0 && (
            <span className="text-amber-300 font-semibold">+Bônus: {formatCurrency(summary?.bonus ?? 0)}</span>
          )}
        </div>
      </div>

      {/* 2. Pódio do Ranking */}
      {showRanking && (
        rankingLoading ? (
          <Skeleton className="h-44 w-full rounded-2xl" />
        ) : (ranking && ranking.length > 0) ? (
          <PodiumCard ranking={ranking} />
        ) : null
      )}

      {/* 3. Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 bg-card border rounded-xl text-center">
          <Users className="h-5 w-5 text-primary mb-1" />
          <span className="text-lg font-semibold">{summary?.clientes_ativos ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Ativos</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-card border rounded-xl text-center">
          <CheckSquare className="h-5 w-5 text-green-500 mb-1" />
          <span className="text-lg font-semibold">{summary?.parcelas_pagas_mes ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Pagas</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-card border rounded-xl text-center">
          <AlertCircle className={cn("h-5 w-5 mb-1", (summary?.parcelas_atrasadas ?? 0) > 0 ? "text-destructive" : "text-muted-foreground")} />
          <span className="text-lg font-semibold">{summary?.parcelas_atrasadas ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Atrasos</span>
        </div>
      </div>

      {/* Tarefas pendentes */}
      {pendingTasksCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-l-4 border-l-amber-400 bg-card p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{pendingTasksCount} tarefa{pendingTasksCount > 1 ? "s" : ""} pendente{pendingTasksCount > 1 ? "s" : ""}</span>
          </div>
          <Link href="/metas" className="text-xs text-primary font-medium">Ver →</Link>
        </div>
      )}

      {/* 4. Atividade Recente */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Atividade Recente
        </h2>
        {(!summary?.recent_events || summary.recent_events.length === 0) ? (
          <div className="text-center p-8 bg-card rounded-xl border border-dashed">
            <p className="text-muted-foreground text-sm">Nenhuma atividade recente.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.recent_events.map(event => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl bg-card border p-3">
                <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {event.tipo === "venda_fechada" && <DollarSign className="h-3.5 w-3.5 text-primary" />}
                  {event.tipo === "parcela_paga" && <CheckSquare className="h-3.5 w-3.5 text-green-500" />}
                  {event.tipo === "atraso" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                  {(event.tipo === "renovacao" || event.tipo === "follow_up" || event.tipo === "anotacao") && (
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{event.client_nome}</span>
                    <time className="text-[11px] text-muted-foreground flex-shrink-0">
                      {format(new Date(event.data), "dd/MM HH:mm")}
                    </time>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {event.tipo.replace("_", " ")}
                    {event.observacao ? ` — ${event.observacao}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
