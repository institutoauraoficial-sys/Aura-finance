'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, MessageCircle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';

export function SubscriptionBlockModal() {
  const router = useRouter();
  const { daysExpired, planName } = useSubscriptionStatus();

  const handleUpgrade = () => {
    router.push('/planos');
  };

  const handleSupport = () => {
    // Buscar URL de suporte das configurações do sistema
    window.open('https://wa.me/5511999999999', '_blank');
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">Acesso Suspenso</h2>
          </div>
          <p className="text-white/90 text-sm">
            Seu plano expirou há {daysExpired} {daysExpired === 1 ? 'dia' : 'dias'}
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Mensagem principal */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Para continuar aproveitando todos os recursos da plataforma,
              renove seu plano ou escolha um novo.
            </p>
          </div>

          {/* Card do plano atual */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Seu Plano Anterior
              </h3>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {planName || 'Plano Free'}
            </p>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button 
              onClick={handleUpgrade}
              className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Ver Planos e Renovar
            </Button>

            <Button 
              onClick={handleSupport}
              variant="outline"
              className="w-full h-12 text-base"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Falar com Suporte
            </Button>
          </div>

          {/* Nota de segurança */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Seus dados estão seguros e serão mantidos por 30 dias.
              <br />
              Renove agora para não perder o acesso.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
