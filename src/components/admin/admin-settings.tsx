"use client";

import { useState, useEffect } from "react";
import { Shield, Lock, Calendar } from "lucide-react";
import { useBranding } from "@/contexts/branding-context";
import { updateAdminSettings } from "@/actions/admin-settings-actions";
import { SuccessModal } from "@/components/admin/success-modal";

export function AdminSettings() {
  const { settings, loading: brandingLoading } = useBranding();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [restringirCadastro, setRestringirCadastro] = useState(false);
  const [diasAcessoFree, setDiasAcessoFree] = useState<number | undefined>(undefined);

  // Carregar dados quando settings mudar
  useEffect(() => {
    if (settings && !brandingLoading) {
      // @ts-ignore - Novos campos ainda não estão no tipo
      const restricao = settings.restringir_cadastro_usuarios_existentes || false;
      // @ts-ignore
      const dias = settings.dias_acesso_free;
      
      setRestringirCadastro(restricao);
      if (dias !== undefined) {
        setDiasAcessoFree(dias);
      }
    }
  }, [settings, brandingLoading]);

  const handleSave = async () => {
    // Validar dias de acesso
    if (diasAcessoFree === undefined || diasAcessoFree < 0 || diasAcessoFree > 365) {
      alert('❌ Dias de acesso deve estar entre 0 e 365');
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateAdminSettings({
        restringir_cadastro_usuarios_existentes: restringirCadastro,
        dias_acesso_free: diasAcessoFree
      });


      if (result.success) {
        setShowSuccessModal(true);
        // Recarregar a página para atualizar o context
        setTimeout(() => window.location.reload(), 1500);
      } else {
        alert('❌ Erro ao salvar: ' + result.error);
      }
    } catch (err) {
      alert('❌ Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-500" />
          Configurações Administrativas
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Controle de acesso e funcionalidades da plataforma
        </p>
      </div>

      {/* Card de Configurações */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
        
        {/* Dias de Acesso Free */}
        <div className="flex items-start gap-3 pb-6 border-b border-zinc-800">
          <Calendar className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-white font-medium mb-2">Dias de Acesso Gratuito (Free)</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Define quantos dias de acesso gratuito novos usuários recebem ao se cadastrar na plataforma.
            </p>
            
            {/* Input de Dias */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="number"
                min="0"
                max="365"
                value={diasAcessoFree ?? ''}
                onChange={(e) => setDiasAcessoFree(Number(e.target.value))}
                disabled={brandingLoading || diasAcessoFree === undefined}
                className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-center font-semibold focus:outline-none focus:border-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-zinc-300 font-medium">
                {brandingLoading || diasAcessoFree === undefined ? 'Carregando...' : 'dias de acesso'}
              </span>
            </div>

            {/* Alerta quando dias = 0 */}
            {diasAcessoFree === 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold mt-0.5">🚫</span>
                  <div>
                    <p className="text-sm text-red-300 font-medium mb-1">Modo Bloqueio Imediato Ativo</p>
                    <p className="text-xs text-red-300/80">
                      Com <strong>0 dias</strong>, novos usuários serão <strong>bloqueados imediatamente</strong> após o cadastro.
                    </p>
                  </div>
                </div>

                <div className="ml-6 space-y-2">
                  <p className="text-xs text-red-300/70 font-medium">O que o usuário consegue fazer:</p>
                  <div className="space-y-1 text-xs text-red-300/60">
                    <p>✅ Criar a conta normalmente (nome, email, senha)</p>
                    <p>✅ Receber e confirmar o email de verificação</p>
                    <p>✅ Fazer login na plataforma</p>
                  </div>

                  <p className="text-xs text-red-300/70 font-medium mt-2">O que acontece após o login:</p>
                  <div className="space-y-1 text-xs text-red-300/60">
                    <p>🔒 É redirecionado automaticamente para a <strong>tela de bloqueio</strong></p>
                    <p>🔒 <strong>Não tem acesso</strong> ao dashboard, transações, cartões ou qualquer funcionalidade</p>
                    <p>🔒 A única opção disponível é <strong>contratar um plano pago</strong></p>
                    <p>🔒 Após a contratação, o acesso é liberado imediatamente</p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-red-500/10">
                    <p className="text-[11px] text-red-300/50">
                      <strong>Fluxo completo:</strong> Cadastro → Confirma Email → Login → Tela de Bloqueio → Contrata Plano → Acesso Liberado
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Descrições Detalhadas */}
            <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold mt-0.5">✓</span>
                <div>
                  <p className="text-sm text-zinc-300">
                    <strong>Como funciona:</strong> {diasAcessoFree === 0 ? (
                      <>Quando um usuário se cadastra, ele <strong>não recebe acesso gratuito</strong>. O acesso é bloqueado até que contrate um plano pago.</>
                    ) : (
                      <>Quando um usuário se cadastra, ele automaticamente recebe o Plano Free com acesso por {diasAcessoFree} dia{diasAcessoFree !== 1 ? 's' : ''}.</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-0.5">ℹ</span>
                <div>
                  <p className="text-sm text-zinc-300">
                    {diasAcessoFree === 0 ? (
                      <><strong>Bloqueio:</strong> O plano já nasce expirado. O usuário é redirecionado para a tela de bloqueio no primeiro login.</>
                    ) : (
                      <><strong>Data de vencimento:</strong> É calculada automaticamente como <code className="bg-zinc-900 px-1 rounded text-xs">data_cadastro + {diasAcessoFree} dias</code></>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold mt-0.5">⚠</span>
                <div>
                  <p className="text-sm text-zinc-300">
                    <strong>Importante:</strong> Esta alteração afeta apenas <strong>novos cadastros</strong>. Usuários já cadastrados mantêm seus dias originais.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold mt-0.5">💡</span>
                <div>
                  <p className="text-sm text-zinc-300">
                    <strong>Sugestões:</strong> Use <strong>0</strong> para exigir plano pago desde o início, <strong>3-7 dias</strong> para teste rápido, <strong>14-30 dias</strong> para avaliação completa, ou <strong>365 dias</strong> para acesso anual.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bloquear Cadastros */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Lock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-white font-medium mb-2">Restringir Cadastros Públicos</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Controla quem pode se cadastrar na plataforma e receber acesso gratuito.
              </p>

              {/* Descrições Detalhadas por Estado */}
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
                {/* Estado: DESLIGADO (Atual) */}
                <div className={`p-3 rounded-lg border-2 ${!restringirCadastro ? 'bg-green-500/10 border-green-500/30' : 'bg-zinc-900/50 border-zinc-700/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${!restringirCadastro ? 'bg-green-500' : 'bg-zinc-600'}`} />
                    <h4 className={`font-semibold ${!restringirCadastro ? 'text-green-400' : 'text-zinc-400'}`}>
                      DESLIGADO - Cadastros Liberados {!restringirCadastro && '(Modo Atual)'}
                    </h4>
                  </div>
                  <div className="space-y-2 ml-5">
                    <p className="text-sm text-zinc-300">
                      ✅ <strong>Qualquer pessoa</strong> pode se cadastrar livremente
                    </p>
                    <p className="text-sm text-zinc-300">
                      ✅ Novos usuários recebem <strong>Plano Free</strong> automaticamente
                    </p>
                    <p className="text-sm text-zinc-300">
                      {diasAcessoFree === 0 ? (
                        <>🚫 <strong>Sem período de teste</strong> - acesso bloqueado até contratar plano</>
                      ) : (
                        <>✅ Período de teste: <strong>{diasAcessoFree} dia{diasAcessoFree !== 1 ? 's' : ''}</strong> de acesso gratuito</>
                      )}
                    </p>
                    <p className="text-sm text-zinc-300">
                      ✅ Após vencimento: usuário precisa assinar plano pago
                    </p>
                    <p className="text-xs text-zinc-400 mt-2 italic">
                      💡 Ideal para captar novos usuários e permitir que testem a plataforma
                    </p>
                  </div>
                </div>

                {/* Estado: LIGADO */}
                <div className={`p-3 rounded-lg border-2 ${restringirCadastro ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-900/50 border-zinc-700/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${restringirCadastro ? 'bg-red-500' : 'bg-zinc-600'}`} />
                    <h4 className={`font-semibold ${restringirCadastro ? 'text-red-400' : 'text-zinc-400'}`}>
                      LIGADO - Cadastros Bloqueados {restringirCadastro && '(Modo Atual)'}
                    </h4>
                  </div>
                  <div className="space-y-2 ml-5">
                    <p className="text-sm text-zinc-300">
                      ❌ <strong>Cadastro público bloqueado</strong> - ninguém pode se cadastrar livremente
                    </p>
                    <p className="text-sm text-zinc-300">
                      ✅ Apenas <strong>dependentes com convite</strong> podem se cadastrar
                    </p>
                    <p className="text-sm text-zinc-300">
                      ✅ Ou quem <strong>comprar um plano diretamente</strong>
                    </p>
                    <p className="text-sm text-zinc-300">
                      ❌ Ninguém recebe Plano Free automaticamente
                    </p>
                    <p className="text-xs text-zinc-400 mt-2 italic">
                      💡 Use quando quiser controlar totalmente quem tem acesso à plataforma
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso Importante */}
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-xs text-yellow-200">
                  <strong>⚠️ Atenção:</strong> Ao ativar o modo restrito, novos visitantes verão uma mensagem informando que cadastros estão bloqueados e precisam de convite ou compra de plano.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setRestringirCadastro(!restringirCadastro)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              restringirCadastro ? 'bg-red-600' : 'bg-green-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                restringirCadastro ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Avisos */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <p className="text-sm text-yellow-200">
          <strong>⚠️ Atenção:</strong> Estas configurações afetam todos os usuários da plataforma.
          Altere com cuidado.
        </p>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Configurações Salvas!"
        message="As configurações administrativas foram atualizadas com sucesso."
      />
    </div>
  );
}
