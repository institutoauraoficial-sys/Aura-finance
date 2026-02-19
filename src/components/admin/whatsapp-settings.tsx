"use client";

import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useWhatsAppConfig } from "@/hooks/use-whatsapp-config";
import { updateWhatsAppConfig } from "@/actions/whatsapp-actions";
import { SuccessModal } from "@/components/admin/success-modal";

export function WhatsAppSettings() {
  const { data: config, refetch } = useWhatsAppConfig();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [habilitado, setHabilitado] = useState(false);
  const [urlWhatsApp, setUrlWhatsApp] = useState('');
  const [textoBotao, setTextoBotao] = useState('Utilizar IA WhatsApp');
  const [videoUrlInstalacao, setVideoUrlInstalacao] = useState('');

  // Carregar dados quando config mudar
  useEffect(() => {
    if (config) {
      setHabilitado(config.whatsapp_enabled || false);
      setUrlWhatsApp(config.whatsapp_contact_url || '');
      setTextoBotao(config.whatsapp_contact_text || 'Utilizar IA WhatsApp');
      setVideoUrlInstalacao(config.video_url_instalacao || '');
    }
  }, [config]);

  const handleSave = async () => {
    
    setLoading(true);
    try {
      const result = await updateWhatsAppConfig({
        whatsapp_enabled: habilitado,
        whatsapp_contact_url: urlWhatsApp,
        whatsapp_contact_text: textoBotao,
        video_url_instalacao: videoUrlInstalacao
      });


      if (result.success) {
        setShowSuccessModal(true);
        refetch();
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
          <MessageCircle className="w-6 h-6 text-green-500" />
          Configurações do WhatsApp
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Configure o botão do WhatsApp que aparecerá no menu da aplicação para seus usuários.
        </p>
      </div>

      {/* Card de Configurações */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-6">
        {/* Toggle Habilitar */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium">Habilitar Botão WhatsApp</h3>
            <p className="text-sm text-zinc-400">
              Se marcado, exibe o botão do WhatsApp no menu da aplicação
            </p>
          </div>
          <button
            onClick={() => setHabilitado(!habilitado)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              habilitado ? 'bg-green-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                habilitado ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* URL do WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            URL do WhatsApp
          </label>
          <input
            type="url"
            value={urlWhatsApp}
            onChange={(e) => setUrlWhatsApp(e.target.value)}
            placeholder="https://api.whatsapp.com/send?phone=5511999999999"
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-green-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Link do WhatsApp com seu número. Exemplo: https://api.whatsapp.com/send?phone=5511999999999
          </p>
        </div>

        {/* Texto do Botão */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Texto do Botão
          </label>
          <input
            type="text"
            value={textoBotao}
            onChange={(e) => setTextoBotao(e.target.value)}
            placeholder="Utilizar IA WhatsApp"
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-green-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Texto que aparecerá no botão do WhatsApp
          </p>
        </div>

        {/* URL do Vídeo de Instalação */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            URL do Vídeo de Instalação (Embed)
          </label>
          <input
            type="url"
            value={videoUrlInstalacao}
            onChange={(e) => setVideoUrlInstalacao(e.target.value)}
            placeholder="https://www.youtube.com/embed/VIDEO_ID"
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-green-500"
          />
          <p className="text-xs text-zinc-500 mt-1">
            URL do vídeo de instalação PWA (formato embed). Exemplo: https://www.youtube.com/embed/dQw4w9WgXcQ
          </p>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {habilitado && urlWhatsApp && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">Preview do Botão</h3>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 inline-block">
            <button className="flex items-center gap-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              <MessageCircle className="w-5 h-5" />
              {textoBotao}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Configurações Salvas!"
        message="As configurações do WhatsApp foram atualizadas com sucesso."
      />
    </div>
  );
}
