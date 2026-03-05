"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateWhatsAppConfig(data: {
  whatsapp_enabled: boolean;
  whatsapp_contact_url: string;
  whatsapp_contact_text: string;
  video_url_instalacao?: string;
}) {
  const supabase = await createClient();
  
  
  // Verificar usuário atual
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: result, error } = await supabase
    .from("configuracoes_sistema")
    .update({
      whatsapp_enabled: data.whatsapp_enabled,
      whatsapp_contact_url: data.whatsapp_contact_url,
      whatsapp_contact_text: data.whatsapp_contact_text,
      video_url_instalacao: data.video_url_instalacao,
      updated_at: new Date().toISOString()
    })
    .eq("id", 1)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}
