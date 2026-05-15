import { useState } from "react";
import {
  useGetCobrancaSummary,
  usePayInstallment,
  useCreateEvent,
  useRenovacaoClient,
  getGetCobrancaSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Phone,
  RefreshCw,
  Search,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  MessageCircle,
  TrendingDown,
  Flame,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Filter = "todos" | "critico" | "risco" | "atencao" | "pagos_hoje";
type CobrancaItem = {
  id: number;
  client_id: number;
  client_nome: string | null;
  client_telefone: string | null;
  vendedor_nome: string | null;
  numero_parcela: number;
  valor: number;
  vencimento: string;
  status: string;
  pago_em: string | null;
  dias_atraso: number;
  risk_level: string | null;
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const cfg = {
    critico: { label: "Crítico", cls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400", icon: Flame },
    risco: { label: "Risco", cls: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400", icon: ShieldAlert },
    atencao: { label: "Atenção", cls: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400", icon: AlertTriangle },
  }[level as "critico" | "risco" | "atencao"];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border", cfg.cls)}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function FilterPill({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count?: number; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:text-foreground"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn("rounded-full px-1 py-0 text-[10px] font-bold leading-4", active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function Cobranca() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: summary, isLoading } = useGetCobrancaSummary();
  const payInstallment = usePayInstallment();
  const createEvent = useCreateEvent();
  const renovacao = useRenovacaoClient();

  const [filter, setFilter] = useState<Filter>("todos");
  const [search, setSearch] = useState("");
  const [payTarget, setPayTarget] = useState<CobrancaItem | null>(null);
  const [valorPago, setValorPago] = useState("");
  const [contactTarget, setContactTarget] = useState<CobrancaItem | null>(null);
  const [contactObs, setContactObs] = useState("");
  const [renegTarget, setRenegTarget] = useState<CobrancaItem | null>(null);
  const [renegParcelas, setRenegParcelas] = useState("3");
  const [renegValor, setRenegValor] = useState("");
  const [renegDia, setRenegDia] = useState("5");

  const canAct = user?.papel === "cobrador" || user?.papel === "lider";

  const allItems: CobrancaItem[] = (summary?.items ?? []) as CobrancaItem[];

  const hoje = new Date().toISOString().split("T")[0];

  const filtered = allItems.filter(item => {
    const matchesSearch =
      !search ||
      (item.client_nome?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (item.client_telefone?.includes(search) ?? false);

    const matchesFilter =
      filter === "todos" ? true
      : filter === "critico" ? item.risk_level === "critico"
      : filter === "risco" ? item.risk_level === "risco"
      : filter === "atencao" ? item.risk_level === "atencao"
      : filter === "pagos_hoje" ? item.pago_em?.startsWith(hoje) ?? false
      : true;

    return matchesSearch && matchesFilter;
  });

  const countByRisk = {
    critico: allItems.filter(i => i.risk_level === "critico").length,
    risco: allItems.filter(i => i.risk_level === "risco").length,
    atencao: allItems.filter(i => i.risk_level === "atencao").length,
    pagos_hoje: allItems.filter(i => i.pago_em?.startsWith(hoje)).length,
  };

  function handlePay(item: CobrancaItem) {
    setPayTarget(item);
    setValorPago(String(item.valor));
  }

  function confirmPayment() {
    if (!payTarget) return;
    const amount = parseFloat(valorPago);
    if (isNaN(amount) || amount <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    payInstallment.mutate(
      { id: payTarget.id, data: { valor_pago: amount } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCobrancaSummaryQueryKey() });
          toast({ title: "Pagamento registrado!", description: `${payTarget.client_nome} — ${formatCurrency(amount)}` });
          setPayTarget(null);
        },
        onError: () => toast({ title: "Erro ao registrar pagamento", variant: "destructive" }),
      }
    );
  }

  function handleContact(item: CobrancaItem) {
    setContactTarget(item);
    setContactObs("");
  }

  function confirmContact() {
    if (!contactTarget) return;
    createEvent.mutate(
      { data: { client_id: contactTarget.client_id, tipo: "follow_up", observacao: contactObs || `Contato registrado — parcela ${contactTarget.numero_parcela}` } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCobrancaSummaryQueryKey() });
          toast({ title: "Contato registrado" });
          setContactTarget(null);
        },
        onError: () => toast({ title: "Erro ao registrar contato", variant: "destructive" }),
      }
    );
  }

  function handleReneg(item: CobrancaItem) {
    setRenegTarget(item);
    setRenegValor(String(item.valor * 3));
    setRenegParcelas("3");
    setRenegDia("5");
  }

  function confirmReneg() {
    if (!renegTarget) return;
    const parcelas = parseInt(renegParcelas);
    const valor = parseFloat(renegValor);
    const dia = parseInt(renegDia);
    if (!parcelas || !valor || !dia) { toast({ title: "Preencha todos os campos", variant: "destructive" }); return; }
    renovacao.mutate(
      { id: renegTarget.client_id, data: { novas_parcelas: parcelas, novo_valor: valor, novo_dia_vencimento: dia } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCobrancaSummaryQueryKey() });
          toast({ title: "Renegociação registrada!" });
          setRenegTarget(null);
        },
        onError: () => toast({ title: "Erro na renegociação", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-24 space-y-4 pt-4">
        <div className="flex gap-2"><Skeleton className="h-8 w-20 rounded-full" /><Skeleton className="h-8 w-20 rounded-full" /></div>
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 max-w-lg mx-auto">
      {/* Stats header */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 p-2">
            <div className="text-lg font-bold text-red-600">{summary?.total_criticos ?? 0}</div>
            <div className="text-[10px] text-red-500 font-medium">Críticos</div>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/30 p-2">
            <div className="text-lg font-bold text-orange-600">{summary?.total_risco ?? 0}</div>
            <div className="text-[10px] text-orange-500 font-medium">Risco</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 p-2">
            <div className="text-lg font-bold text-amber-600">{summary?.total_atencao ?? 0}</div>
            <div className="text-[10px] text-amber-500 font-medium">Atenção</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Total: <strong className="text-foreground">{summary?.total_atrasados ?? 0}</strong> parcelas em atraso &mdash; <strong className="text-foreground">{formatCurrency(summary?.valor_total_atrasado ?? 0)}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <FilterPill active={filter === "todos"} onClick={() => setFilter("todos")} label="Todos" count={allItems.length} />
        <FilterPill active={filter === "critico"} onClick={() => setFilter("critico")} label="Críticos" count={countByRisk.critico} />
        <FilterPill active={filter === "risco"} onClick={() => setFilter("risco")} label="Risco" count={countByRisk.risco} />
        <FilterPill active={filter === "atencao"} onClick={() => setFilter("atencao")} label="Atenção" count={countByRisk.atencao} />
        <FilterPill active={filter === "pagos_hoje"} onClick={() => setFilter("pagos_hoje")} label="Pagos hoje" count={countByRisk.pagos_hoje} />
      </div>

      {/* List */}
      <div className="px-4 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <div>
              <p className="font-semibold text-foreground">Nenhuma parcela encontrada</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {search ? "Tente outra busca" : "Tudo em dia neste filtro!"}
              </p>
            </div>
          </div>
        ) : (
          filtered.map(item => {
            const isPago = item.pago_em != null;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border bg-card p-3 flex flex-col gap-2",
                  item.risk_level === "critico" && "border-l-4 border-l-red-500",
                  item.risk_level === "risco" && "border-l-4 border-l-orange-500",
                  item.risk_level === "atencao" && "border-l-4 border-l-amber-400",
                  !item.risk_level && "border-l-4 border-l-border",
                  isPago && "opacity-60"
                )}
              >
                {/* Row 1: Name + days + value */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate max-w-[140px]">
                      {item.client_nome ?? "—"}
                    </span>
                    <RiskBadge level={item.risk_level} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.dias_atraso > 0 && (
                      <span className="text-xs text-muted-foreground">{item.dias_atraso}d</span>
                    )}
                    <span className="font-bold text-sm text-foreground">{formatCurrency(item.valor)}</span>
                  </div>
                </div>

                {/* Row 2: Phone + parcela + vencimento */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {item.client_telefone && (
                      <a
                        href={`https://wa.me/55${item.client_telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium"
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {item.client_telefone}
                      </a>
                    )}
                    <span>Parc. {item.numero_parcela}</span>
                    <span>Venc. {format(new Date(item.vencimento + "T00:00:00"), "dd/MM")}</span>
                  </div>
                </div>

                {/* Row 3: Actions */}
                {canAct && !isPago && (
                  <div className="flex items-center gap-1.5 pt-0.5 border-t border-border">
                    <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => handlePay(item)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pago
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={() => handleContact(item)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      Contato
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1" onClick={() => handleReneg(item)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reneg.
                    </Button>
                  </div>
                )}
                {isPago && (
                  <p className="text-xs text-green-600 font-medium border-t border-border pt-1.5">
                    ✓ Pago em {item.pago_em ? format(new Date(item.pago_em), "dd/MM HH:mm") : "—"}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Payment dialog */}
      <Dialog open={!!payTarget} onOpenChange={open => !open && setPayTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Cliente:</span> <strong>{payTarget.client_nome}</strong></p>
                <p><span className="text-muted-foreground">Parcela:</span> {payTarget.numero_parcela}</p>
                <p><span className="text-muted-foreground">Vencimento:</span> {format(new Date(payTarget.vencimento + "T00:00:00"), "dd/MM/yyyy")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor recebido (R$)</Label>
                <Input type="number" value={valorPago} onChange={e => setValorPago(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancelar</Button>
            <Button onClick={confirmPayment} disabled={payInstallment.isPending}>
              {payInstallment.isPending ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact dialog */}
      <Dialog open={!!contactTarget} onOpenChange={open => !open && setContactTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Contato</DialogTitle></DialogHeader>
          {contactTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Registrar contato com <strong className="text-foreground">{contactTarget.client_nome}</strong>
              </p>
              <div className="space-y-1.5">
                <Label>Observação (opcional)</Label>
                <Input
                  placeholder="Ex: Prometeu pagar amanhã..."
                  value={contactObs}
                  onChange={e => setContactObs(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactTarget(null)}>Cancelar</Button>
            <Button onClick={confirmContact} disabled={createEvent.isPending}>
              {createEvent.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renegotiation dialog */}
      <Dialog open={!!renegTarget} onOpenChange={open => !open && setRenegTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renegociar Dívida</DialogTitle></DialogHeader>
          {renegTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Renegociar dívida de <strong className="text-foreground">{renegTarget.client_nome}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Novas parcelas</Label>
                  <Input type="number" min="1" value={renegParcelas} onChange={e => setRenegParcelas(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Dia vencimento</Label>
                  <Input type="number" min="1" max="28" value={renegDia} onChange={e => setRenegDia(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Valor total (R$)</Label>
                <Input type="number" value={renegValor} onChange={e => setRenegValor(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenegTarget(null)}>Cancelar</Button>
            <Button onClick={confirmReneg} disabled={renovacao.isPending}>
              {renovacao.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
