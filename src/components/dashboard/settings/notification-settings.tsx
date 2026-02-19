"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Bell, MessageCircle, Mail, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { SuccessNotificationModal } from "@/components/ui/success-notification-modal";

interface NotificationConfig {
  enabled: boolean;
  whatsapp: boolean;
  email: boolean;
  reminderTime: string;
}

export function NotificationSettings() {
  const { t } = useLanguage();
  const { profile } = useUser();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [settings, setSettings] = useState<NotificationConfig>({
    enabled: false,
    whatsapp: false,
    email: false,
    reminderTime: 'vencimento'
  });

  // Carregar configurações do banco de dados
  useEffect(() => {
    const loadPreferences = async () => {
      if (!profile?.id) return;
      
      try {
        const supabase = createClient();
        
        // Buscar preferências do usuário
        // RLS policy usa verificar_proprietario_por_auth() que retorna usuarios.id baseado em auth.uid()
        const { data, error } = await supabase
          .from('preferencias_notificacao')
          .select('*');
        
        if (error) {
          console.error('Erro detalhado:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          // Converter dados do banco para formato do componente
          const hasEmailGeral = data.find(p => p.tipo_notificacao === 'email_geral' && p.habilitado);
          const lembreteVencimento = data.find(p => p.tipo_notificacao === 'lembrete_vencimento');
          
          // Mapear dias_antecedencia para reminderTime
          const diasMap: Record<number, string> = {
            0: 'vencimento',
            1: '1dia',
            3: '3dias',
            7: '7dias'
          };
          
          setSettings({
            enabled: lembreteVencimento?.habilitado ?? false,
            email: hasEmailGeral ? true : false,
            whatsapp: hasEmailGeral ? true : false, // Usar email_geral para ambos (email e whatsapp)
            reminderTime: lembreteVencimento?.dias_antecedencia !== null 
              ? (diasMap[lembreteVencimento.dias_antecedencia] || 'vencimento')
              : 'vencimento'
          });
        } else {
          // Se não há dados no banco, garantir que tudo está desativado
          setSettings({
            enabled: false,
            whatsapp: false,
            email: false,
            reminderTime: 'vencimento'
          });
        }
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreferences();
  }, [profile?.id]);

  const handleSave = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    try {
      const supabase = createClient();
      
      // 1. Deletar preferências antigas do usuário
      const { error: deleteError } = await supabase
        .from('preferencias_notificacao')
        .delete()
        .eq('usuario_id', profile.id);
      
      if (deleteError) throw deleteError;
      
      // 2. Preparar novas preferências
      const preferences = [];
      
      // Email geral (representa notificações por email e whatsapp)
      if (settings.enabled && (settings.email || settings.whatsapp)) {
        preferences.push({
          usuario_id: profile.id,
          tipo_notificacao: 'email_geral',
          habilitado: true,
          dias_antecedencia: null
        });
      }
      
      // Lembrete de vencimento (sempre salvar para manter configuração)
      const diasMap: Record<string, number> = {
        'vencimento': 0,
        '1dia': 1,
        '3dias': 3,
        '7dias': 7
      };
      
      preferences.push({
        usuario_id: profile.id,
        tipo_notificacao: 'lembrete_vencimento',
        habilitado: settings.enabled,
        dias_antecedencia: diasMap[settings.reminderTime] ?? 0
      });
      
      // 3. Inserir novas preferências
      if (preferences.length > 0) {
        const { error: insertError } = await supabase
          .from('preferencias_notificacao')
          .insert(preferences);
        
        if (insertError) throw insertError;
      }
      
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao salvar preferências:', error);
      alert(t('settings.saveError') + ': ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">{t('settings.notificationConfig')}</h3>
        <p className="text-sm text-zinc-400">{t('settings.notificationDesc')}</p>
      </div>
      
      {/* ... Resto do componente igual ... */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-8">
        
        {/* Habilitar Geral */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <span className="font-medium text-white">{t('settings.enableNotifications')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={settings.enabled}
              onChange={e => setSettings({...settings, enabled: e.target.checked})}
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <span className="font-medium text-white">{t('settings.whatsapp')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={settings.whatsapp}
              onChange={e => setSettings({...settings, whatsapp: e.target.checked})}
              disabled={!settings.enabled}
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-purple-500" />
            </div>
            <span className="font-medium text-white">{t('settings.email')}</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={settings.email}
              onChange={e => setSettings({...settings, email: e.target.checked})}
              disabled={!settings.enabled}
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Quando Lembrar */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="font-medium text-white">{t('settings.reminderTime')}</span>
          </div>
          <select
            value={settings.reminderTime}
            onChange={e => setSettings({...settings, reminderTime: e.target.value})}
            disabled={!settings.enabled}
            className="w-full bg-[#0A0F1C] border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="vencimento">{t('settings.onDueDate')}</option>
            <option value="1dia">{t('settings.oneDayBefore')}</option>
            <option value="3dias">{t('settings.threeDaysBefore')}</option>
            <option value="7dias">7 {t('settings.oneDayBefore').replace('1', '7')}</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('settings.save')}
        </button>
      </div>

      {/* Modal de Sucesso */}
      <SuccessNotificationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={t('success.saved')}
        message={t('success.notificationsUpdated')}
      />
    </div>
  );
}
