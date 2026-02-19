"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useUser } from "@/hooks/use-user";
import { useUserFilter } from "@/hooks/use-user-filter";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#A855F7'];

interface MonthlyCategory {
  month: string;
  monthLabel: string;
  categories: Record<string, number>;
  total: number;
}

async function fetchMonthlyExpenses(
  userId: number,
  accountFilter: 'pessoal' | 'pj',
  months: number,
  userFilter?: 'todos' | 'principal' | number | null
) {
  const supabase = createClient();
  const now = new Date();

  // Buscar transações dos últimos N meses
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let query = supabase
    .from('transacoes')
    .select(`
      data, valor, tipo,
      categoria:categoria_trasacoes!inner(descricao)
    `)
    .eq('usuario_id', userId)
    .eq('tipo_conta', accountFilter)
    .eq('tipo', 'saida')
    .gte('data', formatLocalDate(startDate))
    .lte('data', formatLocalDate(endDate))
    .or('is_transferencia.is.null,is_transferencia.eq.false');

  if (userFilter === 'principal') {
    query = query.is('dependente_id', null);
  } else if (typeof userFilter === 'number' && userFilter > 0) {
    query = query.eq('dependente_id', userFilter);
  }

  // Excluir pagamentos de fatura para não duplicar
  const { data, error } = await query.order('data', { ascending: true });

  if (error) throw error;

  // Filtrar pagamentos de fatura
  const filtered = (data || []).filter(
    (t: any) => !t.descricao?.toLowerCase().includes('pagamento fatura')
  );

  // Também buscar lançamentos futuros de cartão (pagos) no mesmo período
  let futureQuery = supabase
    .from('lancamentos_futuros')
    .select(`
      data_prevista, valor, tipo, status, cartao_id,
      categoria:categoria_trasacoes!inner(descricao)
    `)
    .eq('usuario_id', userId)
    .eq('tipo', 'saida')
    .not('cartao_id', 'is', null)
    .gte('data_prevista', formatLocalDate(startDate))
    .lte('data_prevista', formatLocalDate(endDate));

  const { data: futureData } = await futureQuery;

  // Agrupar por mês
  const monthlyMap = new Map<string, MonthlyCategory>();

  // Inicializar meses
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = format(d, 'MMM/yy', { locale: ptBR });
    monthlyMap.set(key, { month: key, monthLabel: label, categories: {}, total: 0 });
  }

  // Processar transações efetivadas
  filtered.forEach((t: any) => {
    const date = new Date(t.data + 'T12:00:00');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      const catName = t.categoria?.descricao || 'Outros';
      entry.categories[catName] = (entry.categories[catName] || 0) + Number(t.valor);
      entry.total += Number(t.valor);
    }
  });

  // Processar lançamentos futuros de cartão (pagos e pendentes)
  (futureData || []).forEach((t: any) => {
    if (t.status === 'cancelado') return;
    const date = new Date(t.data_prevista + 'T12:00:00');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (entry) {
      const catName = t.categoria?.descricao || 'Outros';
      entry.categories[catName] = (entry.categories[catName] || 0) + Number(t.valor);
      entry.total += Number(t.valor);
    }
  });

  return Array.from(monthlyMap.values());
}

interface CategorySpendingAnalysisProps {
  className?: string;
}

export function CategorySpendingAnalysis({ className }: CategorySpendingAnalysisProps) {
  const { t, language } = useLanguage();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const { filter: accountFilter } = useAccountFilter();
  const { profile } = useUser();
  const { filter: userFilter } = useUserFilter();
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data: monthlyData, isLoading } = useQuery({
    queryKey: ['categorySpending', profile?.id, accountFilter, selectedMonths, userFilter],
    queryFn: () => {
      if (!profile) throw new Error('Not authenticated');
      return fetchMonthlyExpenses(profile.id, accountFilter, selectedMonths, userFilter);
    },
    enabled: !!profile,
  });

  // Calcular ranking de categorias com média, total e tendência
  const categoryRanking = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];

    const categoryTotals = new Map<string, { months: number[]; total: number }>();

    monthlyData.forEach((month, idx) => {
      Object.entries(month.categories).forEach(([cat, val]) => {
        if (!categoryTotals.has(cat)) {
          categoryTotals.set(cat, { months: new Array(monthlyData.length).fill(0), total: 0 });
        }
        const entry = categoryTotals.get(cat)!;
        entry.months[idx] = val;
        entry.total += val;
      });
    });

    const grandTotal = Array.from(categoryTotals.values()).reduce((s, c) => s + c.total, 0);

    return Array.from(categoryTotals.entries())
      .map(([name, data], index) => {
        const monthsWithData = data.months.filter(v => v > 0).length;
        const average = monthsWithData > 0 ? data.total / monthsWithData : 0;
        const percentage = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;

        // Tendência: comparar últimos 2 meses com dados
        const lastMonth = data.months[data.months.length - 1] || 0;
        const prevMonth = data.months[data.months.length - 2] || 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercent = 0;
        if (prevMonth > 0) {
          trendPercent = ((lastMonth - prevMonth) / prevMonth) * 100;
          if (trendPercent > 5) trend = 'up';
          else if (trendPercent < -5) trend = 'down';
        }

        return {
          name,
          total: data.total,
          average,
          percentage,
          monthsWithData,
          months: data.months,
          trend,
          trendPercent,
          color: COLORS[index % COLORS.length],
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthlyData]);

  const grandTotal = categoryRanking.reduce((s, c) => s + c.total, 0);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 h-96 animate-pulse" />
      </div>
    );
  }

  if (!monthlyData || monthlyData.length === 0) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">Análise de Gastos por Categoria</h2>
            <p className="text-xs sm:text-sm text-zinc-400">Acompanhe seus gastos e identifique onde economizar</p>
          </div>
        </div>

        {/* Seletor de período */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonths(m)}
              className={cn(
                "px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors",
                selectedMonths === m
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:border-white/20"
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">Total no período</p>
          <p className="text-base sm:text-xl font-bold font-mono text-white truncate">{formatCurrency(grandTotal)}</p>
          <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">{selectedMonths} meses</p>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">Média mensal</p>
          <p className="text-base sm:text-xl font-bold font-mono text-amber-400 truncate">
            {formatCurrency(monthlyData.length > 0 ? grandTotal / monthlyData.length : 0)}
          </p>
          <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">por mês</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[#111827] border border-white/5 rounded-xl p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-zinc-500 mb-1">Categorias ativas</p>
          <p className="text-base sm:text-xl font-bold font-mono text-white">{categoryRanking.length}</p>
          <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">com gastos no período</p>
        </div>
      </div>

      {/* Ranking de categorias */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-3 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-lg font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
            Ranking de Categorias
          </h3>
          <span className="text-[10px] sm:text-xs text-zinc-500">{categoryRanking.length} categorias</span>
        </div>

        <div className="space-y-2 sm:space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
          {categoryRanking.map((cat, idx) => (
            <div key={cat.name} className="group">
              {/* Main row */}
              <button
                onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors border border-white/5">
                  {/* Rank */}
                  <div className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0",
                    idx === 0 ? "bg-amber-500/20 text-amber-400" :
                    idx === 1 ? "bg-zinc-400/20 text-zinc-300" :
                    idx === 2 ? "bg-orange-600/20 text-orange-400" :
                    "bg-white/5 text-zinc-500"
                  )}>
                    {idx + 1}
                  </div>

                  {/* Color dot + Name */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs sm:text-sm font-medium text-white truncate">{cat.name}</span>
                  </div>

                  {/* Trend - hide text on mobile, show only icon */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {cat.trend === 'up' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                        <TrendingUp className="w-3 h-3 text-red-400" />
                        <span className="text-[9px] sm:text-[10px] text-red-400 font-medium hidden sm:inline">+{cat.trendPercent.toFixed(0)}%</span>
                      </div>
                    )}
                    {cat.trend === 'down' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <TrendingDown className="w-3 h-3 text-green-400" />
                        <span className="text-[9px] sm:text-[10px] text-green-400 font-medium hidden sm:inline">{cat.trendPercent.toFixed(0)}%</span>
                      </div>
                    )}
                    {cat.trend === 'stable' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20">
                        <Minus className="w-3 h-3 text-zinc-400" />
                        <span className="text-[9px] sm:text-[10px] text-zinc-400 font-medium hidden sm:inline">estável</span>
                      </div>
                    )}
                  </div>

                  {/* Average - hidden on mobile */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs text-zinc-500">média/mês</p>
                    <p className="text-sm font-mono font-medium text-zinc-300">{formatCurrency(cat.average)}</p>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] sm:text-xs text-zinc-500">{cat.percentage.toFixed(1)}%</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-white">{formatCurrency(cat.total)}</p>
                  </div>

                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 transition-transform flex-shrink-0",
                    expandedCategory === cat.name && "rotate-180"
                  )} />
                </div>
              </button>

              {/* Progress bar */}
              <div className="mx-3 mt-1">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>

              {/* Expanded: monthly breakdown */}
              {expandedCategory === cat.name && (
                <div className="mx-1 sm:mx-3 mt-2 p-2 sm:p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
                    {cat.months.map((val, mIdx) => {
                      const monthData = monthlyData[mIdx];
                      if (!monthData) return null;
                      const isMax = val === Math.max(...cat.months.filter(v => v > 0));
                      const isMin = val > 0 && val === Math.min(...cat.months.filter(v => v > 0));
                      return (
                        <div
                          key={mIdx}
                          className={cn(
                            "p-2 rounded-lg text-center border transition-colors",
                            isMax ? "bg-red-500/10 border-red-500/20" :
                            isMin ? "bg-green-500/10 border-green-500/20" :
                            val > 0 ? "bg-white/[0.03] border-white/5" :
                            "bg-white/[0.01] border-white/[0.03] opacity-40"
                          )}
                        >
                          <p className="text-[10px] text-zinc-500 uppercase">{monthData.monthLabel}</p>
                          <p className={cn(
                            "text-xs font-mono font-medium mt-0.5",
                            val > 0 ? "text-white" : "text-zinc-600"
                          )}>
                            {val > 0 ? formatCurrency(val) : '—'}
                          </p>
                          {isMax && <p className="text-[9px] text-red-400 mt-0.5">maior</p>}
                          {isMin && <p className="text-[9px] text-green-400 mt-0.5">menor</p>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 mt-2 sm:mt-3 pt-2 border-t border-white/5">
                    <span className="text-[10px] sm:text-xs text-zinc-500">Presente em {cat.monthsWithData} de {selectedMonths} meses</span>
                    <span className="text-[10px] sm:text-xs text-zinc-400 font-mono">Média: {formatCurrency(cat.average)}/mês</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {categoryRanking.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum gasto encontrado no período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
