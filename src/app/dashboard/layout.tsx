"use client";

import { AccountFilterProvider } from "@/contexts/account-filter-context";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { SubscriptionBlockModal } from "@/components/dashboard/subscription-block-modal";
import { SubscriptionWarningBanner } from "@/components/dashboard/subscription-warning-banner";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import dynamic from 'next/dynamic';

// Sidebar com SSR desabilitado para evitar flash de branding
const DashboardSidebarDynamic = dynamic(
  () => import('@/components/dashboard/sidebar').then(m => ({
    default: m.DashboardSidebar
  })),
  {
    ssr: false,
    loading: () => (
      <div className="w-[260px] bg-[#111827] border-r border-white/5 animate-pulse flex-shrink-0" />
    )
  }
);

// Header com SSR desabilitado para evitar flash do nome do usuário
const DashboardHeaderDynamic = dynamic(
  () => import('@/components/dashboard/header').then(m => ({
    default: m.DashboardHeader
  })),
  {
    ssr: false,
    loading: () => (
      <div className="h-16 bg-[#0A0F1C] border-b border-white/5 animate-pulse" />
    )
  }
);

// Bottom Navigation
const BottomNavDynamic = dynamic(
  () => import('@/components/dashboard/bottom-nav').then(m => ({
    default: m.BottomNav
  })),
  {
    ssr: false
  }
);

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { blockingLevel } = useSubscriptionStatus();

  return (
    <div className="flex h-screen bg-[#0A0F1C] text-white overflow-hidden">
      {/* Modal de bloqueio suave (1-13 dias expirado) */}
      {blockingLevel === 'soft-block' && <SubscriptionBlockModal />}

      {/* Sidebar */}
      <DashboardSidebarDynamic />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeaderDynamic />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {/* Banner de aviso (3 dias antes de expirar) */}
          {blockingLevel === 'warning' && <SubscriptionWarningBanner />}
          
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavDynamic />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountFilterProvider>
      <SidebarProvider>
        <DashboardLayoutContent>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </AccountFilterProvider>
  );
}
