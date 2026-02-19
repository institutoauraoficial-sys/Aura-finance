"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface InvoicePaidWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceMonth: string;
}

export function InvoicePaidWarningModal({
  isOpen,
  onClose,
  invoiceMonth,
}: InvoicePaidWarningModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fatura Já Paga"
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-white">
            Não é possível adicionar despesas
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            A fatura de <span className="font-semibold text-white">{invoiceMonth}</span> já foi paga.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Para adicionar esta despesa, escolha uma data que faça ela ir para uma fatura em aberto.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-xs text-blue-400 leading-relaxed">
            💡 <span className="font-semibold">Dica:</span> Compras realizadas após o dia de fechamento do cartão vão para a próxima fatura.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={onClose}
            className="px-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium"
          >
            Entendi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
