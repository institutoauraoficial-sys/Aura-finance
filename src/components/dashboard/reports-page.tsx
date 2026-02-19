"use client";

import { useMemo, useState, useEffect } from "react";
import { useExportPDFNew } from "@/hooks/use-export-pdf-new";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon, 
  BarChart3,
  Download,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  LineChart as LineChartIcon,
  Receipt,
  CalendarClock,
  ArrowRightCircle,
  CreditCard,
  Building2,
  TrendingUpIcon,
  Repeat
} from "lucide-react";
import { format, isAfter, isBefore, isSameDay, startOfDay, endOfDay } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { useLanguage } from "@/contexts/language-context";
import { useCurrency } from "@/contexts/currency-context";
import { useTransactionsQuery } from "@/hooks/use-transactions-query";
import { useFutureTransactionsQuery } from "@/hooks/use-future-transactions-query";
import { useAccounts } from "@/hooks/use-accounts";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { useCreditCards } from "@/hooks/use-credit-cards";
import { useInvestmentSummary } from "@/hooks/use-investment-summary";
import { PatrimonyOverviewSection } from "./patrimony-overview-section";
import { CategorySpendingAnalysis } from "./category-spending-analysis";
import { cn } from "@/lib/utils";

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function ReportsPage() {
  const { t, language } = useLanguage();
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const { period, customRange } = usePeriodFilter();
  const { transactions, loading, stats } = useTransactionsQuery(period as any, customRange);
  const { filter: accountFilter } = useAccountFilter();
  
  // Hooks para previsão financeira
  const { transactions: futureTransactions, loading: loadingFuture } = useFutureTransactionsQuery();
  const { accounts } = useAccounts(accountFilter);
  const { cards } = useCreditCards();
  const tipoContaInvestimento = accountFilter === 'pessoal' ? 'pessoal' : 'pj';
  const { stats: investmentStats, loading: loadingInvestments } = useInvestmentSummary(tipoContaInvestimento);

  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { exportReportToPDF } = useExportPDFNew();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const periodLabel = period === 'custom' && customRange
        ? `${format(new Date(customRange.start), 'dd-MM-yyyy')}_${format(new Date(customRange.end), 'dd-MM-yyyy')}`
        : period === 'month'
        ? format(new Date(), 'MM-yyyy')
        : period === 'year'
        ? format(new Date(), 'yyyy')
        : format(new Date(), 'dd-MM-yyyy');
      
      const accountType = accountFilter === 'pessoal' ? 'Pessoal' : 'PJ';
      const filename = `Relatorio_${accountType}_${periodLabel}.pdf`;
      
      // Preparar dados para o novo hook
      const reportData = {
        stats,
        forecastData,
        incomeCategories,
        expenseCategories,
        topExpenses,
        evolutionData,
        period,
        customRange: customRange || undefined,
        accountFilter,
        formatCurrency
      };
      
      await exportReportToPDF(reportData, filename);
    } catch (error) {
    } finally {
      setIsExporting(false);
    }
  };

  // Calcular intervalo de datas selecionado (para filtrar lançamentos futuros)
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    if (period === 'custom' && customRange) {
      // Parse as local date to avoid timezone issues
      const [sy, sm, sd] = customRange.start.split('-').map(Number);
      const [ey, em, ed] = customRange.end.split('-').map(Number);
      start = new Date(sy, sm - 1, sd);
      end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    } else {
      switch (period) {
        case 'day':
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
      }
    }
    return { start, end };
  }, [period, customRange]);

  // Filtrar e calcular dados de previsão
  const forecastData = useMemo(() => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];

    const filtered = futureTransactions.filter(t => {
      const tDate = t.data_prevista.split('T')[0];
      return tDate >= startStr && tDate <= endStr && t.status === 'pendente';
    });

    const pendingIncome = filtered
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const pendingExpense = filtered
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const currentBalance = accounts.reduce((sum, acc) => sum + acc.saldo_atual, 0);
    
    // Saldo Previsto = Saldo Atual + (Receitas Pendentes - Despesas Pendentes)
    // Nota: O saldo atual já considera transações realizadas. 
    // Se o filtro for passado, receitas pendentes serão 0 (ou deveriam ser).
    // Se for futuro, adicionamos o que falta acontecer.
    const projectedBalance = currentBalance + pendingIncome - pendingExpense;

    return {
      pendingIncome,
      pendingExpense,
      projectedBalance,
      currentBalance,
      incomes: filtered.filter(t => t.tipo === 'entrada'),
      expenses: filtered.filter(t => t.tipo === 'saida')
    };
  }, [futureTransactions, dateRange, accounts]);

  // Agrupar dados por mês/dia para o gráfico de evolução
  const evolutionData = useMemo(() => {
    const grouped = new Map();
    
    // Ordenar transações por data (antiga para nova)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    sortedTransactions.forEach(t => {
      // Se o período for 'day' ou 'week', agrupar por dia. Senão, por mês.
      const date = new Date(t.data);
      let key = "";
      let label = "";

      if (period === 'day' || period === 'week') {
         key = t.data.split('T')[0];
         label = format(date, 'dd/MM', { locale: ptBR });
      } else if (period === 'year') {
         key = format(date, 'yyyy-MM');
         label = format(date, 'MMM', { locale: ptBR });
      } else {
         key = t.data.split('T')[0];
         label = format(date, 'dd/MM', { locale: ptBR });
      }

      if (!grouped.has(key)) {
        grouped.set(key, { name: label, fullDate: key, Receitas: 0, Despesas: 0, Saldo: 0 });
      }
      
      const item = grouped.get(key);
      if (t.tipo === 'entrada') {
        item.Receitas += Number(t.valor);
      } else {
        item.Despesas += Number(t.valor);
      }
      item.Saldo = item.Receitas - item.Despesas;
    });

    return Array.from(grouped.values());
  }, [transactions, period]);

  // Dados acumulados para o gráfico de linha (Fluxo de Caixa)
  const cumulativeData = useMemo(() => {
    let accumulated = 0;
    return evolutionData.map(item => {
      accumulated += item.Saldo;
      return {
        ...item,
        Acumulado: accumulated
      };
    });
  }, [evolutionData]);

  // Top 5 maiores despesas
  const topExpenses = useMemo(() => {
    return transactions
      .filter(t => t.tipo === 'saida')
      .sort((a, b) => Number(b.valor) - Number(a.valor))
      .slice(0, 5);
  }, [transactions]);

  // Agrupar dados por categoria (UNIFICADO: transações efetivadas + cartão pendente)
  const getCategoryData = (type: 'entrada' | 'saida') => {
    const categoryMap = new Map();
    
    // 1. Transações efetivadas (dinheiro, débito)
    // IMPORTANTE: Excluir pagamentos de fatura para evitar duplicação
    // (os itens pagos já são contados pelos lancamentos_futuros com status='pago')
    transactions
      .filter(t => {
        if (t.tipo !== type) return false;
        
        // Excluir transações de pagamento de fatura (começam com "Pagamento Fatura")
        if (t.descricao?.toLowerCase().includes('pagamento fatura')) return false;
        
        return true;
      })
      .forEach(t => {
        const name = t.categoria?.descricao || 'Outros';
        const current = categoryMap.get(name) || { efetivado: 0, cartaoPendente: 0 };
        current.efetivado += Number(t.valor);
        categoryMap.set(name, current);
      });
    
    // 2. Lançamentos futuros de cartão (só despesas)
    // IMPORTANTE: Filtrar pelo período selecionado para percentuais corretos
    if (type === 'saida') {
      const startStr = dateRange.start.toISOString().split('T')[0];
      const endStr = dateRange.end.toISOString().split('T')[0];
      
      futureTransactions
        .filter(t => {
          if (!t.cartao_id || t.tipo !== 'saida') return false;
          
          // Filtrar pelo período selecionado
          const tDate = t.data_prevista.split('T')[0];
          return tDate >= startStr && tDate <= endStr;
        })
        .forEach(t => {
          const name = t.categoria?.descricao || 'Outros';
          const current = categoryMap.get(name) || { efetivado: 0, cartaoPendente: 0 };
          
          // Se está pago, conta como efetivado na categoria original
          // Se está pendente, conta como cartão pendente
          if (t.status === 'pago') {
            current.efetivado += Number(t.valor);
          } else if (t.status === 'pendente') {
            current.cartaoPendente += Number(t.valor);
          }
          
          categoryMap.set(name, current);
        });
    }

    return Array.from(categoryMap.entries())
      .map(([name, values], index) => ({
        name,
        efetivado: values.efetivado,
        cartaoPendente: values.cartaoPendente,
        total: values.efetivado + values.cartaoPendente,
        value: values.efetivado + values.cartaoPendente, // Para compatibilidade com PDF export
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.total - a.total);
  };

  const incomeCategories = useMemo(() => getCategoryData('entrada'), [transactions, futureTransactions, dateRange]);
  const expenseCategories = useMemo(() => getCategoryData('saida'), [transactions, futureTransactions, dateRange]);

  // Calcular total real de despesas (efetivado + cartão pendente) para percentuais corretos
  const totalExpensesWithCard = useMemo(() => {
    return expenseCategories.reduce((sum, cat) => sum + cat.total, 0);
  }, [expenseCategories]);

  const totalIncomeWithCard = useMemo(() => {
    return incomeCategories.reduce((sum, cat) => sum + cat.total, 0);
  }, [incomeCategories]);

  // 🔄 Calcular transações recorrentes ativas
  const recurringData = useMemo(() => {
    // Filtrar apenas lançamentos recorrentes ativos (pendentes)
    const recurring = futureTransactions.filter(t => t.recorrente && t.status === 'pendente');
    
    // Separar por tipo
    const recurringIncome = recurring.filter(t => t.tipo === 'entrada');
    const recurringExpense = recurring.filter(t => t.tipo === 'saida');
    
    // Calcular totais mensais (valor único de cada recorrente)
    // Como são recorrentes, cada um representa um compromisso mensal
    const uniqueIncomes = new Map();
    const uniqueExpenses = new Map();
    
    recurringIncome.forEach(t => {
      const key = `${t.descricao}-${t.valor}-${t.periodicidade}`;
      if (!uniqueIncomes.has(key)) {
        uniqueIncomes.set(key, t);
      }
    });
    
    recurringExpense.forEach(t => {
      const key = `${t.descricao}-${t.valor}-${t.periodicidade}`;
      if (!uniqueExpenses.has(key)) {
        uniqueExpenses.set(key, t);
      }
    });
    
    const totalRecurringIncome = Array.from(uniqueIncomes.values())
      .reduce((sum, t) => sum + Number(t.valor), 0);
    
    const totalRecurringExpense = Array.from(uniqueExpenses.values())
      .reduce((sum, t) => sum + Number(t.valor), 0);
    
    return {
      incomes: Array.from(uniqueIncomes.values()),
      expenses: Array.from(uniqueExpenses.values()),
      totalIncome: totalRecurringIncome,
      totalExpense: totalRecurringExpense,
      balance: totalRecurringIncome - totalRecurringExpense
    };
  }, [futureTransactions]);

  // 💳 Calcular gastos previstos por cartão de crédito
  // LÓGICA: Mostrar a FATURA ABERTA ATUAL (considera dia de fechamento)
  // Se ainda não fechou → mostrar mês atual
  // Se já fechou → mostrar próximo mês
  const creditCardData = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    
    // Determinar qual mês de fatura mostrar baseado no dia de fechamento
    // Pegar o menor dia de fechamento entre todos os cartões
    const earliestClosingDay = cards.length > 0 
      ? Math.min(...cards.map(c => c.dia_fechamento || 1))
      : 1;
    
    let invoiceMonthDate: Date;
    if (currentDay <= earliestClosingDay) {
      // Ainda estamos no período da fatura do mês atual
      invoiceMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Já passou o fechamento, mostrar próximo mês
      invoiceMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    
    const invoiceMonthStr = `${invoiceMonthDate.getFullYear()}-${String(invoiceMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Agrupar lançamentos futuros por cartão
    const cardMap = new Map();
    
    // Inicializar todos os cartões com valor 0
    cards.forEach(card => {
      cardMap.set(card.id, {
        id: card.id,
        nome: card.nome,
        bandeira: card.bandeira,
        cor: card.cor_cartao,
        total: 0,
        count: 0
      });
    });
    
    // Adicionar apenas lançamentos PENDENTES da FATURA ABERTA
    futureTransactions
      .filter(t => {
        if (!t.cartao_id) return false;
        if (t.status !== 'pendente') return false;
        
        // Filtrar apenas lançamentos do mês da fatura aberta (mes_previsto)
        return t.mes_previsto === invoiceMonthStr;
      })
      .forEach(t => {
        const current = cardMap.get(t.cartao_id);
        if (current) {
          current.total += Number(t.valor);
          current.count += 1;
        }
      });

    const cardList = Array.from(cardMap.values()).sort((a, b) => b.total - a.total);
    const totalCards = cardList.reduce((sum, c) => sum + c.total, 0);

    return {
      cards: cardList.map(c => ({
        ...c,
        percentage: totalCards > 0 ? (c.total / totalCards) * 100 : 0
      })),
      total: totalCards,
      count: cards.length,
      invoiceMonth: invoiceMonthStr
    };
  }, [futureTransactions, cards]);

  // 🏦 Calcular resumo de contas bancárias
  const accountsData = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.saldo_atual, 0);
    
    return {
      accounts: accounts.map(acc => ({
        id: acc.id,
        nome: acc.nome,
        saldo: acc.saldo_atual,
        percentage: totalBalance > 0 ? (acc.saldo_atual / totalBalance) * 100 : 0
      })).sort((a, b) => b.saldo - a.saldo),
      total: totalBalance,
      count: accounts.length
    };
  }, [accounts]);

  // 📈 Resumo de investimentos
  const investmentsData = useMemo(() => {
    if (!investmentStats) {
      return {
        total: 0,
        invested: 0,
        profit: 0,
        profitPercentage: 0,
        count: 0,
        byType: []
      };
    }

    return {
      total: investmentStats.currentValue || 0,
      invested: investmentStats.totalInvested || 0,
      profit: investmentStats.profitLoss || 0,
      profitPercentage: investmentStats.profitLossPercentage || 0,
      count: investmentStats.totalAssets || 0,
      byType: investmentStats.byType || []
    };
  }, [investmentStats]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{t('reports.title')}</h1>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
              accountFilter === 'pessoal' 
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
            )}>
              {accountFilter === 'pessoal' ? '👤 Pessoal' : '🏢 PJ'}
            </span>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            {t('reports.description')}
          </p>
        </div>

        {/* Export PDF Button */}
        <button
          onClick={handleExportPDF}
          disabled={!mounted || isExporting || loading}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
            "bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D]",
            "text-white shadow-lg shadow-[#22C55E]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            "min-w-[140px]"
          )}
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm">Exportando...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span className="text-sm">Exportar PDF</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 md:w-24 md:h-24 text-[#22C55E]" />
          </div>
          <div className="relative z-10">
            <div className="text-xs md:text-sm text-zinc-400 mb-2 flex items-center gap-2">
              <div className="p-1.5 bg-[#22C55E]/10 rounded-lg">
                <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4 text-[#22C55E]" />
              </div>
              {t('reports.totalIncome')}
            </div>
            <p className="text-2xl md:text-3xl font-bold font-mono text-white">
              {formatCurrency(stats.income)}
            </p>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-1">
              {stats.incomeCount} {t('reports.transactionsRegistered')}
            </p>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-xl p-4 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown className="w-16 h-16 md:w-24 md:h-24 text-[#EF4444]" />
          </div>
          <div className="relative z-10">
            <div className="text-xs md:text-sm text-zinc-400 mb-2 flex items-center gap-2">
              <div className="p-1.5 bg-[#EF4444]/10 rounded-lg">
                <ArrowDownRight className="w-3 h-3 md:w-4 md:h-4 text-[#EF4444]" />
              </div>
              {t('reports.totalExpenses')}
            </div>
            <p className="text-2xl md:text-3xl font-bold font-mono text-white">
              {formatCurrency(stats.expenses)}
            </p>
            <p className="text-[10px] md:text-xs text-zinc-500 mt-1">
              {stats.expensesCount} {t('reports.transactionsRegistered')}
            </p>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-xl p-4 md:p-6 relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet className="w-16 h-16 md:w-24 md:h-24 text-blue-500" />
          </div>
          <div className="relative z-10">
            <div className="text-xs md:text-sm text-zinc-400 mb-2 flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 rounded-lg">
                <Wallet className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
              </div>
              {t('reports.periodBalance')}
            </div>
            <p className={cn(
              "text-2xl md:text-3xl font-bold font-mono",
              stats.balance >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
            )}>
              {formatCurrency(stats.balance)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] md:text-xs text-zinc-500">
                {t('reports.savings')}:
              </span>
              <span className={cn(
                "text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full",
                stats.savingsRate >= 0 ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#EF4444]/10 text-[#EF4444]"
              )}>
                {stats.savingsRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            {t('reports.incomeVsExpenses')}
          </h3>
          <div className="w-full" style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={evolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 12 }}
                  tickFormatter={(val) => `${getCurrencySymbol()}${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    const translatedName = name === 'Receitas' ? t('reports.income') : t('reports.expenses');
                    return [formatCurrency(value || 0), translatedName];
                  }}
                />
                <Legend 
                  formatter={(value: string) => value === 'Receitas' ? t('reports.income') : t('reports.expenses')}
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Bar dataKey="Receitas" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Flow Chart */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-zinc-400" />
            {t('reports.cumulativeCashFlow')}
          </h3>
          <div className="w-full" style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={cumulativeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717A', fontSize: 12 }}
                  tickFormatter={(val) => `${getCurrencySymbol()}${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                />
                <Area 
                  type="monotone" 
                  dataKey="Acumulado" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAcumulado)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Forecast Section */}
      <div className="pt-8 border-t border-white/10">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-blue-500" />
          {t('reports.forecast')} ({t('reports.noPending').replace('Nenhum lançamento pendente', 'Pendentes')})
        </h2>
        
        {/* Forecast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
           {/* Total a Receber */}
           <div className="bg-[#111827] border border-white/5 rounded-xl p-6 relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
                  <div className="p-1.5 bg-[#22C55E]/10 rounded-lg">
                    <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  {t('reports.toReceive')}
                </div>
                <p className="text-3xl font-bold font-mono text-[#22C55E]">
                  {formatCurrency(forecastData.pendingIncome)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {format(dateRange.start, 'dd/MM/yyyy')} - {format(dateRange.end, 'dd/MM/yyyy')}
                </p>
             </div>
           </div>

           {/* Total a Pagar */}
           <div className="bg-[#111827] border border-white/5 rounded-xl p-6 relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
                  <div className="p-1.5 bg-[#EF4444]/10 rounded-lg">
                    <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                  </div>
                  {t('reports.toPay')}
                </div>
                <p className="text-3xl font-bold font-mono text-[#EF4444]">
                  {formatCurrency(forecastData.pendingExpense)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {format(dateRange.start, 'dd/MM/yyyy')} - {format(dateRange.end, 'dd/MM/yyyy')}
                </p>
             </div>
           </div>

           {/* Saldo Previsto */}
           <div className="bg-[#111827] border border-white/5 rounded-xl p-6 relative overflow-hidden">
             <div className="relative z-10">
                <div className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <Wallet className="w-4 h-4 text-blue-500" />
                  </div>
                  {t('reports.projectedBalance')}
                </div>
                <p className={cn(
                  "text-3xl font-bold font-mono",
                  forecastData.projectedBalance >= 0 ? "text-blue-500" : "text-[#EF4444]"
                )}>
                  {formatCurrency(forecastData.projectedBalance)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {t('reports.projectedFormula')}
                </p>
             </div>
           </div>
        </div>

        {/* Forecast Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receitas Pendentes */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
             <div className="flex justify-between items-center mb-4">
               <div>
                 <h3 className="text-lg font-semibold text-white">{t('reports.pendingIncomeTitle')}</h3>
                 <p className="text-sm text-zinc-400">{t('reports.toReceiveLabel')}</p>
               </div>
               <span className="px-2 py-1 bg-[#22C55E]/10 text-[#22C55E] text-xs rounded border border-[#22C55E]/20">
                 {t('reports.incomeLabel')}
               </span>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
               {forecastData.incomes.map((item) => (
                 <div key={item.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex justify-between items-center">
                   <div className="flex flex-col gap-1">
                     <span className="text-sm font-medium text-white line-clamp-1">{item.descricao}</span>
                     <div className="flex items-center gap-2 text-xs text-zinc-500">
                       <span>{format(new Date(item.data_prevista), "dd/MM/yyyy", { locale: ptBR })}</span>
                       <span className="px-1.5 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                         {item.categoria?.descricao || 'Outros'}
                       </span>
                     </div>
                   </div>
                   <span className="text-sm font-bold text-[#22C55E] whitespace-nowrap">
                     {formatCurrency(item.valor)}
                   </span>
                 </div>
               ))}
               
               {forecastData.incomes.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <Receipt className="w-8 h-8 opacity-50" />
                    <p className="text-sm">{t('reports.noPendingIncome')}</p>
                  </div>
               )}
             </div>
          </div>

          {/* Despesas Pendentes */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
             <div className="flex justify-between items-center mb-4">
               <div>
                 <h3 className="text-lg font-semibold text-white">{t('reports.pendingExpensesTitle')}</h3>
                 <p className="text-sm text-zinc-400">{t('reports.toPayLabel')}</p>
               </div>
               <span className="px-2 py-1 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded border border-[#EF4444]/20">
                 {t('reports.expenseLabel')}
               </span>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
               {forecastData.expenses.map((item) => (
                 <div key={item.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex justify-between items-center">
                   <div className="flex flex-col gap-1">
                     <span className="text-sm font-medium text-white line-clamp-1">{item.descricao}</span>
                     <div className="flex items-center gap-2 text-xs text-zinc-500">
                       <span>{format(new Date(item.data_prevista), "dd/MM/yyyy", { locale: ptBR })}</span>
                       <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                         {item.categoria?.descricao || 'Outros'}
                       </span>
                     </div>
                   </div>
                   <span className="text-sm font-bold text-[#EF4444] whitespace-nowrap">
                     {formatCurrency(item.valor)}
                   </span>
                 </div>
               ))}

               {forecastData.expenses.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <Receipt className="w-8 h-8 opacity-50" />
                    <p className="text-sm">{t('reports.noPendingExpense')}</p>
                  </div>
               )}
             </div>
          </div>
        </div>
      </div>

      {/* 🔄 Seção de Transações Recorrentes */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Repeat className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Despesas e Receitas Recorrentes</h2>
            <p className="text-sm text-zinc-400">Compromissos financeiros mensais ativos</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Receitas Recorrentes */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#22C55E]/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Receitas Recorrentes</p>
                <p className="text-xs text-zinc-500">{recurringData.incomes.length} ativas</p>
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-[#22C55E]">
              {formatCurrency(recurringData.totalIncome)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">por mês</p>
          </div>

          {/* Despesas Recorrentes */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#EF4444]/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Despesas Recorrentes</p>
                <p className="text-xs text-zinc-500">{recurringData.expenses.length} ativas</p>
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-[#EF4444]">
              {formatCurrency(recurringData.totalExpense)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">por mês</p>
          </div>

          {/* Saldo Recorrente */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Repeat className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Saldo Recorrente</p>
                <p className="text-xs text-zinc-500">impacto mensal</p>
              </div>
            </div>
            <p className={cn(
              "text-2xl font-bold font-mono",
              recurringData.balance >= 0 ? "text-[#22C55E]" : "text-[#EF4444]"
            )}>
              {formatCurrency(recurringData.balance)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">receitas - despesas</p>
          </div>
        </div>

        {/* Recurring Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receitas Recorrentes List */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Receitas Recorrentes</h3>
                <p className="text-sm text-zinc-400">Entradas mensais automáticas</p>
              </div>
              <span className="px-2 py-1 bg-[#22C55E]/10 text-[#22C55E] text-xs rounded border border-[#22C55E]/20">
                {recurringData.incomes.length} ativas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {recurringData.incomes.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-white line-clamp-1">{item.descricao}</span>
                    <span className="text-sm font-bold text-[#22C55E] whitespace-nowrap ml-2">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-1.5 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                      {item.categoria?.descricao || 'Outros'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {item.periodicidade || 'mensal'}
                    </span>
                    {item.data_final && (
                      <span className="text-zinc-600">até {format(new Date(item.data_final), "MM/yyyy")}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {recurringData.incomes.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <Repeat className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Nenhuma receita recorrente ativa</p>
                </div>
              )}
            </div>
          </div>

          {/* Despesas Recorrentes List */}
          <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Despesas Recorrentes</h3>
                <p className="text-sm text-zinc-400">Saídas mensais automáticas</p>
              </div>
              <span className="px-2 py-1 bg-[#EF4444]/10 text-[#EF4444] text-xs rounded border border-[#EF4444]/20">
                {recurringData.expenses.length} ativas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {recurringData.expenses.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-white line-clamp-1">{item.descricao}</span>
                    <span className="text-sm font-bold text-[#EF4444] whitespace-nowrap ml-2">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                      {item.categoria?.descricao || 'Outros'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {item.periodicidade || 'mensal'}
                    </span>
                    {item.data_final && (
                      <span className="text-zinc-600">até {format(new Date(item.data_final), "MM/yyyy")}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {recurringData.expenses.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <Repeat className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Nenhuma despesa recorrente ativa</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patrimony Overview Section */}
      <PatrimonyOverviewSection
        creditCardData={creditCardData}
        accountsData={accountsData}
        investmentsData={investmentsData}
      />

      {/* Category Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income Categories */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-zinc-400" />
            {t('reports.incomeOrigin')}
          </h3>
          
          <div className="w-full relative" style={{ height: '256px' }}>
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={incomeCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total"
                  stroke="none"
                >
                  {incomeCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-zinc-400 font-bold text-xl">{stats.income > 0 ? '100%' : '0%'}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-60 custom-scrollbar pr-2">
            {incomeCategories.map((cat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-zinc-400">{cat.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{formatCurrency(cat.total)}</p>
                  <p className="text-xs text-zinc-500">
                    {totalIncomeWithCard > 0 ? ((cat.total / totalIncomeWithCard) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <p className="text-center text-zinc-500 py-4 text-sm">{t('reports.noIncomeData')}</p>
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-zinc-400" />
            {t('reports.expenseDestination')}
          </h3>
          
          <div className="w-full relative" style={{ height: '256px' }}>
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number | undefined) => formatCurrency(value || 0)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[#EF4444] font-bold text-xl">{stats.expenses > 0 ? '100%' : '0%'}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-60 custom-scrollbar pr-2">
            {expenseCategories.map((cat, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm text-zinc-400">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{formatCurrency(cat.total)}</p>
                    <p className="text-xs text-zinc-500">
                      {totalExpensesWithCard > 0 ? ((cat.total / totalExpensesWithCard) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                {cat.cartaoPendente > 0 && (
                  <div className="flex items-center gap-2 ml-5 text-xs">
                    <span className="text-zinc-600">✓ {formatCurrency(cat.efetivado)} efetivado</span>
                    <span className="text-orange-400">💳 {formatCurrency(cat.cartaoPendente)} cartão</span>
                  </div>
                )}
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <p className="text-center text-zinc-500 py-4 text-sm">{t('reports.noExpenseData')}</p>
            )}
          </div>
        </div>

        {/* Top Expenses List */}
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#EF4444]" />
            {t('reports.topExpenses')}
          </h3>
          
          <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar space-y-3 pr-2">
            {topExpenses.map((expense) => (
              <div key={expense.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-white line-clamp-1">
                    {expense.descricao}
                  </span>
                  <span className="text-sm font-bold text-[#EF4444] whitespace-nowrap">
                    {formatCurrency(expense.valor)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>{format(new Date(expense.data), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                    {expense.categoria?.descricao || 'Outros'}
                  </span>
                </div>
              </div>
            ))}
            
            {topExpenses.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Receipt className="w-8 h-8 opacity-50" />
                <p className="text-sm">{t('reports.noExpensesInPeriod')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Spending Analysis - Análise por Categoria (final da página) */}
      <CategorySpendingAnalysis />
    </div>
  );
}
