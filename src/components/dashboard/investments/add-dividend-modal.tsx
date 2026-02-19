"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/currency-context";
import { useLanguage } from "@/contexts/language-context";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountFilter } from "@/hooks/use-account-filter";
import { createClient } from "@/lib/supabase/client";
import type { PositionDetailed, DividendType } from "@/types/investments";

interface AddDividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: PositionDetailed;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const useDividendTypes = () => {
  const { t } = useLanguage();
  return [
    { value: "dividendo" as DividendType, label: t('investments.modal.dividend') },
    { value: "jcp" as DividendType, label: t('investments.modal.jcp') },
    { value: "rendimento" as DividendType, label: t('investments.modal.yield') },
    { value: "amortizacao" as DividendType, label: t('investments.modal.amortization') },
  ];
};

export function AddDividendModal({
  isOpen,
  onClose,
  position,
  onSuccess,
  onError
}: AddDividendModalProps) {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { filter: accountFilter } = useAccountFilter();
  const { accounts } = useAccounts(accountFilter);
  const DIVIDEND_TYPES = useDividendTypes();

  const [tipo, setTipo] = useState<DividendType>("dividendo");
  const [valorPorAtivo, setValorPorAtivo] = useState("");
  const [dataCom, setDataCom] = useState("");
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");
  const [contaId, setContaId] = useState("");
  const [criarTransacao, setCriarTransacao] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!valorPorAtivo || !dataPagamento) {
      onError(t('validation.fillRequired'));
      return;
    }

    if (dataCom && dataPagamento && dataCom > dataPagamento) {
      onError(t('validation.comDateBeforePayment'));
      return;
    }

    if (criarTransacao && !contaId) {
      onError('Selecione uma conta bancária para criar a transação');
      return;
    }

    setLoading(true);
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar user_id da tabela usuarios
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user', user.id)
        .single();

      if (!userData) throw new Error('Usuário não encontrado');

      const valorTotal = Number(valorPorAtivo) * Number(position.quantidade);
      let transacaoId = null;

      // Se deve criar transação de receita
      if (criarTransacao && contaId) {
        // Buscar ou criar categoria específica "Proventos de Investimentos"
        const { data: categoriaProventos } = await supabase
          .from('categoria_trasacoes')
          .select('id')
          .eq('usuario_id', userData.id)
          .eq('tipo_conta', accountFilter)
          .eq('descricao', 'Proventos de Investimentos')
          .maybeSingle();

        let categoriaId = categoriaProventos?.id;

        // Se não existe, criar a categoria padrão
        if (!categoriaId) {
          const { data: novaCategoria, error: categoriaError } = await supabase
            .from('categoria_trasacoes')
            .insert({
              usuario_id: userData.id,
              descricao: 'Proventos de Investimentos',
              tipo: 'entrada',
              tipo_conta: accountFilter,
            })
            .select('id')
            .single();

          if (categoriaError) throw categoriaError;
          categoriaId = novaCategoria.id;
        }

        // Criar transação de receita
        const { data: transacao, error: transacaoError } = await supabase
          .from('transacoes')
          .insert({
            usuario_id: userData.id,
            tipo: 'entrada',
            valor: valorTotal,
            descricao: `${tipo === 'dividendo' ? 'Dividendo' : tipo === 'jcp' ? 'JCP' : tipo === 'rendimento' ? 'Rendimento' : 'Amortização'} - ${position.ticker}`,
            data: dataPagamento,
            mes: new Date(dataPagamento).toISOString().slice(0, 7),
            conta_id: contaId,
            tipo_conta: accountFilter,
            categoria_id: categoriaId,
          })
          .select('id')
          .single();

        if (transacaoError) throw transacaoError;
        transacaoId = transacao.id;

        // Atualizar saldo da conta diretamente
        const { data: contaAtual, error: contaError } = await supabase
          .from('contas_bancarias')
          .select('saldo_atual')
          .eq('id', contaId)
          .single();

        if (contaError) throw contaError;

        const novoSaldo = Number(contaAtual.saldo_atual) + valorTotal;

        const { error: saldoError } = await supabase
          .from('contas_bancarias')
          .update({ saldo_atual: novoSaldo })
          .eq('id', contaId);

        if (saldoError) throw saldoError;
      }

      // Inserir dividendo
      const { error } = await supabase
        .from("investment_dividends")
        .insert({
          position_id: position.id,
          tipo,
          valor_por_ativo: Number(valorPorAtivo),
          data_com: dataCom || null,
          data_pagamento: dataPagamento,
          observacao: observacao || null,
          conta_id: contaId || null,
          transacao_id: transacaoId,
        });

      if (error) throw error;

      handleClose();
      onSuccess();
    } catch (error: any) {
      onError(error.message || t('validation.errorAddingDividend'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTipo("dividendo");
    setValorPorAtivo("");
    setDataCom("");
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setObservacao("");
    setContaId("");
    setCriarTransacao(false);
    onClose();
  };

  const totalValue = valorPorAtivo ? Number(valorPorAtivo) * Number(position.quantidade) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('investments.modal.addDividend')}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-white">{position.ticker}</p>
              {position.asset_name && (
                <p className="text-sm text-zinc-400">{position.asset_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400">{t('investments.modal.quantityInfo')}</p>
              <p className="text-lg font-bold text-white">
                {Number(position.quantidade).toLocaleString('pt-BR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 8
                })}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {t('investments.modal.dividendType')}
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as DividendType)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DIVIDEND_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {t('investments.modal.valuePerAsset')}
          </label>
          <input
            type="number"
            step="0.01"
            value={valorPorAtivo}
            onChange={(e) => setValorPorAtivo(e.target.value)}
            required
            placeholder="0.00"
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            {t('investments.modal.valuePerAssetNote')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t('investments.modal.comDate')}
            </label>
            <input
              type="date"
              value={dataCom}
              onChange={(e) => setDataCom(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500 mt-1">
              {t('investments.modal.comDateNote')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              {t('investments.modal.paymentDate')}
            </label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {t('investments.modal.observation')}
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={t('investments.modal.observationPlaceholder')}
          />
        </div>

        {/* Seção de Conta Bancária */}
        <div className="border-t border-zinc-700 pt-4 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-400 mb-1">
                💰 Registrar Entrada na Conta Bancária
              </p>
              <p className="text-xs text-zinc-400">
                Marque esta opção se o provento foi creditado diretamente na sua conta bancária. Isso criará automaticamente uma transação de receita.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="criarTransacao"
              checked={criarTransacao}
              onChange={(e) => {
                setCriarTransacao(e.target.checked);
                if (!e.target.checked) {
                  setContaId("");
                }
              }}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="criarTransacao" className="text-sm text-zinc-300 cursor-pointer">
              Criar transação de receita na conta bancária
            </label>
          </div>

          {criarTransacao && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Conta Bancária *
              </label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                required={criarTransacao}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione a conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.nome} - {formatCurrency(account.saldo_atual)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                O valor de {formatCurrency(totalValue)} será adicionado ao saldo desta conta
              </p>
            </div>
          )}
        </div>

        {totalValue > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">{t('investments.modal.totalReceived')}</p>
            <p className="text-2xl font-bold text-green-500">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {Number(valorPorAtivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × {Number(position.quantidade).toLocaleString('pt-BR')} {t('investments.modal.assets')}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? t('investments.modal.addingDividend') : t('investments.modal.addDividendButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
