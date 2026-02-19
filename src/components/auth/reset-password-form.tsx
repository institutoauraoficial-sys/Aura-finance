"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/language-context";

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Schema for validation with translations
  const resetPasswordSchema = z.object({
    password: z.string().min(6, { message: t('error.passwordMin') }),
    confirmPassword: z.string().min(6, { message: t('error.confirmPassword') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('error.passwordMismatch'),
    path: ["confirmPassword"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validar sessão ao carregar o componente
  useEffect(() => {
    const validateSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          alert('Sessão expirada ou inválida. Você será redirecionado para solicitar um novo link.');
          window.location.href = '/esqueci-senha';
          return;
        }
        
        setSessionValid(true);
      } catch (error) {
        alert('Erro ao validar sessão. Tente novamente.');
        window.location.href = '/esqueci-senha';
      } finally {
        setIsValidatingSession(false);
      }
    };

    validateSession();
  }, []);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      const supabase = createClient();

      // Verificar se há uma sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('Sessão expirada. Por favor, solicite um novo link de recuperação.');
        window.location.href = '/esqueci-senha';
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        // Error shown via setErrorMessage below
        setErrorMessage(`Erro ao redefinir senha: ${error.message}`);
        return;
      }

      // Sucesso! Mostrar modal
      setShowSuccessModal(true);
      
      // Aguardar 3 segundos, fazer logout e redirecionar
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }, 3000);

    } catch (error: any) {
      // Error shown via setErrorMessage below
      setErrorMessage('Erro ao redefinir senha. Tente novamente.');
    }
  };

  // Mostrar loading enquanto valida sessão
  if (isValidatingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-zinc-400">Validando sessão...</p>
      </div>
    );
  }

  // Se sessão não é válida, não renderizar nada (já redirecionou)
  if (!sessionValid) {
    return null;
  }

  // Modal de sucesso
  if (showSuccessModal) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Senha redefinida com sucesso!
              </h3>
              <p className="text-sm text-zinc-300 mb-3">
                Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em alguns segundos.
              </p>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecionando...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
              <span className="text-red-400 text-xs font-bold">✕</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-400 font-medium leading-relaxed">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Password Input */}
      <div className="flex flex-col w-full space-y-2">
        <label className="text-sm font-medium leading-none text-white" htmlFor="password">
          {t('reset.newPassword')}
        </label>
        <Input
          {...register("password")}
          id="password"
          placeholder="Mínimo 6 caracteres"
          type={showPassword ? "text" : "password"}
          startIcon={<Lock className="h-5 w-5" />}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-zinc-500 hover:text-white focus:outline-none transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          }
        />
        {errors.password && (
          <p className="text-xs text-red-400 ml-2">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm Password Input */}
      <div className="flex flex-col w-full space-y-2">
        <label className="text-sm font-medium leading-none text-white" htmlFor="confirmPassword">
          {t('reset.confirmPassword')}
        </label>
        <Input
          {...register("confirmPassword")}
          id="confirmPassword"
          placeholder="Digite a senha novamente"
          type={showConfirmPassword ? "text" : "password"}
          startIcon={<Lock className="h-5 w-5" />}
          endIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-zinc-500 hover:text-white focus:outline-none transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          }
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-400 ml-2">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Password Requirements */}
      <div className="bg-[#1E293B]/60 rounded-lg p-4 border border-white/10">
        <p className="text-xs text-zinc-400 mb-2 font-medium">{t('reset.requirements')}</p>
        <ul className="text-xs text-zinc-500 space-y-1">
          <li>• {t('reset.minChars')}</li>
          <li>• {t('reset.useSymbols')}</li>
          <li>• {t('reset.avoidObvious')}</li>
        </ul>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full"
      >
        {isSubmitting ? t('reset.buttonLoading') : t('reset.button')}
      </Button>
    </form>
  );
}
