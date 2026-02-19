"use client";

import { useState } from "react";
import { AdminDependent } from "@/hooks/use-admin-dependents";
import { Modal } from "@/components/ui/modal";
import { X, Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DependentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dependent: AdminDependent;
  onConfirm: (dependentId: number, deleteAuth: boolean) => Promise<{ success: boolean; error?: string }>;
}

export function DependentDeleteModal({
  isOpen,
  onClose,
  dependent,
  onConfirm,
}: DependentDeleteModalProps) {
  const [deleteAuth, setDeleteAuth] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    setDeleting(true);

    try {
      const result = await onConfirm(dependent.id, deleteAuth);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Erro ao excluir dependente");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao excluir dependente");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Excluir Dependente</h2>
              <p className="text-sm text-zinc-400 mt-1">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                <span className="text-red-400 text-xs font-bold">✕</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Warning Message */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-white font-medium mb-2">
            Você está prestes a excluir o dependente:
          </p>
          <div className="bg-white/5 rounded-lg p-3 space-y-1">
            <p className="text-white font-semibold">{dependent.nome}</p>
            <p className="text-sm text-zinc-400">{dependent.email || "Sem email"}</p>
            <p className="text-xs text-zinc-500">ID: #{dependent.id}</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold">O que será excluído:</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>Registro do dependente na tabela <code className="text-xs bg-white/10 px-1 rounded">usuarios_dependentes</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">•</span>
              <span>Histórico de chat do WhatsApp/N8N (se existir)</span>
            </li>
            {dependent.auth_user_id && (
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Conta de autenticação (opcional - veja abaixo)</span>
              </li>
            )}
          </ul>
        </div>

        {/* Delete Auth Option */}
        {dependent.auth_user_id && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteAuth}
                onChange={(e) => setDeleteAuth(e.target.checked)}
                disabled={deleting}
                className="mt-1 w-4 h-4 rounded border-yellow-500/30 bg-white/5 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <div className="flex-1">
                <p className="text-white font-medium">Excluir também da autenticação</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Remove a conta de login do dependente. Ele não poderá mais fazer login no sistema.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                <span>Confirmar Exclusão</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
