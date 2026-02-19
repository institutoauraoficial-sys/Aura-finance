"use client";

import { AdminDependent } from "@/hooks/use-admin-dependents";
import { Modal } from "@/components/ui/modal";
import { X, User, Mail, Phone, Shield, Calendar, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DependentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependent: AdminDependent;
}

export function DependentDetailsModal({
  isOpen,
  onClose,
  dependent,
}: DependentDetailsModalProps) {
  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Detalhes do Dependente</h2>
            <p className="text-sm text-zinc-400 mt-1">Informações completas do usuário</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white/5 rounded-xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Informações Básicas
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Nome</label>
                <p className="text-white font-medium mt-1">{dependent.nome}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">ID</label>
                <p className="text-white font-medium mt-1">#{dependent.id}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Email
                </label>
                <p className="text-white font-medium mt-1">{dependent.email || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </label>
                <p className="text-white font-medium mt-1">{dependent.telefone || "Não informado"}</p>
              </div>
            </div>
          </div>

          {/* Usuário Principal */}
          <div className="bg-white/5 rounded-xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Usuário Principal
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Nome</label>
                <p className="text-white font-medium mt-1">{dependent.principal_nome}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">ID</label>
                <p className="text-white font-medium mt-1">#{dependent.usuario_principal_id}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Email</label>
                <p className="text-white font-medium mt-1">{dependent.principal_email}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Plano</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                  dependent.principal_plano?.toLowerCase() === 'free' || !dependent.principal_plano
                    ? 'bg-zinc-500/20 text-zinc-300'
                    : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {dependent.principal_plano || 'Free'}
                </span>
              </div>
            </div>
          </div>

          {/* Status e Convite */}
          <div className="bg-white/5 rounded-xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Status e Acesso
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    dependent.status === 'ativo'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {dependent.status}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Convite</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    dependent.convite_status === 'aceito'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {dependent.convite_status}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Login</label>
                <div className="mt-1">
                  {dependent.auth_user_id ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300">
                      ✓ Possui conta
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-zinc-500/20 text-zinc-400">
                      Sem conta
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="bg-white/5 rounded-xl p-4 lg:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-400" />
              Histórico
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Criado em</label>
                <p className="text-white font-medium mt-1">{formatDate(dependent.data_criacao)}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Última modificação</label>
                <p className="text-white font-medium mt-1">{formatDate(dependent.data_ultima_modificacao)}</p>
              </div>
              
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider">Convite enviado em</label>
                <p className="text-white font-medium mt-1">{formatDate(dependent.convite_enviado_em)}</p>
              </div>
            </div>
          </div>

          {/* Observações */}
          {dependent.observacoes && (
            <div className="bg-white/5 rounded-xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Observações</h3>
              <p className="text-zinc-300 text-sm">{dependent.observacoes}</p>
            </div>
          )}

          {/* Permissões */}
          {dependent.permissoes && (
            <div className="bg-white/5 rounded-xl p-4 lg:p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Permissões</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {Object.entries(dependent.permissoes).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-sm text-zinc-400">{key.replace(/_/g, ' ')}</span>
                    <span className={`text-sm font-medium ${
                      value === true ? 'text-green-400' : 
                      value === false ? 'text-red-400' : 
                      'text-zinc-300'
                    }`}>
                      {typeof value === 'boolean' ? (value ? '✓' : '✗') : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
