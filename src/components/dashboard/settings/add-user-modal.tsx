"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Loader2 } from "lucide-react";
import { useBranding } from "@/contexts/branding-context";
import { SuccessModal } from "./success-modal";
import { ErrorModal } from "./error-modal";

import { inviteMember } from "@/actions/team-actions";
import { sendWebhookInvite } from "@/actions/webhook-actions";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const { settings } = useBranding();
  const [loading, setLoading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMemberId, setSavedMemberId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: ""
  });

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de campos obrigatórios
    if (!formData.email || !formData.email.trim()) {
      setErrorMessage("Email é obrigatório");
      setShowErrorModal(true);
      return;
    }
    
    if (!formData.telefone || !formData.telefone.trim()) {
      setErrorMessage("Telefone é obrigatório");
      setShowErrorModal(true);
      return;
    }
    
    setLoading(true);

    try {
      const result = await inviteMember(formData);

      if (result.success) {
        onClose();
        setShowSuccessModal(true);
        onSuccess();
      } else {
        setErrorMessage(result.error || "Erro ao adicionar membro");
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro inesperado ao adicionar usuário");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de campos obrigatórios
    if (!formData.email || !formData.email.trim()) {
      setErrorMessage("Email é obrigatório");
      setShowErrorModal(true);
      return;
    }
    
    if (!formData.telefone || !formData.telefone.trim()) {
      setErrorMessage("Telefone é obrigatório para enviar convite via WhatsApp");
      setShowErrorModal(true);
      return;
    }
    
    setSendingWhatsApp(true);

    try {
      // 1. Primeiro adiciona o membro
      const result = await inviteMember(formData);

      if (!result.success) {
        setErrorMessage(result.error || "Erro ao adicionar membro");
        setShowErrorModal(true);
        setSendingWhatsApp(false);
        return;
      }

      // 2. Buscar o ID do membro recém-criado
      // Como não temos o ID no retorno, vamos buscar pelo email
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: member } = await supabase
        .from('usuarios_dependentes')
        .select('id')
        .eq('email', formData.email)
        .order('data_criacao', { ascending: false })
        .limit(1)
        .single();

      if (!member) {
        setErrorMessage("Membro criado mas não foi possível enviar o convite");
        setShowErrorModal(true);
        setSendingWhatsApp(false);
        return;
      }

      // 3. Enviar via webhook
      const webhookResult = await sendWebhookInvite({
        memberId: member.id,
        memberName: formData.nome,
        memberEmail: formData.email,
        memberPhone: formData.telefone,
      });

      if (webhookResult.success) {
        onClose();
        setShowSuccessModal(true);
        onSuccess();
      } else {
        setErrorMessage(webhookResult.error || "Erro ao enviar convite via WhatsApp");
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro inesperado");
      setShowErrorModal(true);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setFormData({ nome: "", email: "", telefone: "" });
  };

  const handleErrorClose = () => {
    setShowErrorModal(false);
    setErrorMessage("");
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Adicionar Pessoa"
        className="max-w-md"
      >
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <p className="text-sm text-zinc-400 -mt-4">
            A pessoa precisa criar uma conta usando o email cadastrado aqui
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Nome</label>
              <Input
                required
                placeholder="Nome"
                value={formData.nome}
                onChange={e => setFormData({...formData, nome: e.target.value})}
                className="bg-[#0A0F1C] border-zinc-800 text-white placeholder:text-zinc-500 h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                E-mail <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="bg-[#0A0F1C] border-zinc-800 text-white placeholder:text-zinc-500 h-11"
              />
              <p className="text-xs text-zinc-500">
                E-mail é usado para a pessoa fazer login e acessar a plataforma.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Telefone <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                value={formData.telefone}
                onChange={(value) => setFormData({...formData, telefone: value})}
                placeholder="Digite o número"
                showSaveFormat={false}
              />
              <p className="text-xs text-zinc-500">
                Telefone é obrigatório para enviar convites.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {/* Botão Enviar Convite WhatsApp */}
            <Button 
              type="button"
              onClick={handleSubmitWhatsApp}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center gap-2"
              disabled={loading || sendingWhatsApp}
            >
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando convite...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Enviar Convite WhatsApp
                </>
              )}
            </Button>
            
            {/* Botão Adicionar Manualmente */}
            <Button 
              type="button"
              onClick={handleSubmitManual}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading || sendingWhatsApp}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Adicionar Manualmente
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={onClose}
              className="w-full h-11 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white bg-transparent"
              disabled={loading || sendingWhatsApp}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Sucesso - Fora do Modal principal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        memberName={formData.nome}
        memberEmail={formData.email}
        appName={settings.appName}
      />

      {/* Modal de Erro */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleErrorClose}
        message={errorMessage}
      />
    </>
  );
}
