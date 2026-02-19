import { createClient } from '@/lib/supabase/client';

/**
 * Retorna o UUID do proprietário dos dados:
 * - Se for usuário principal: retorna seu próprio auth.uid()
 * - Se for dependente: retorna o auth_user do principal
 * 
 * Isso garante que contas/transações criadas por dependentes
 * fiquem vinculadas ao UUID do principal no campo usuario_id
 */
export async function getOwnerUUID(): Promise<string | null> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verificar se é dependente
  const { data: dependenteData } = await supabase
    .from('usuarios_dependentes')
    .select('usuario_principal_id, usuarios!inner(auth_user)')
    .eq('auth_user_id', user.id)
    .eq('status', 'ativo')
    .single();

  // Se for dependente, retornar auth_user do principal
  if (dependenteData) {
    const usuarios = dependenteData.usuarios as any;
    if (usuarios?.auth_user) {
      return usuarios.auth_user;
    }
  }

  // Se for principal, retornar próprio UUID
  return user.id;
}
