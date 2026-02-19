"use client";

import { useState } from "react";
import { useAdminDependents, AdminDependent } from "@/hooks/use-admin-dependents";
import { Search, Users, UserCheck, UserX, Clock, Shield, Eye, Edit, Trash2, Key } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DependentsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedFilters, setSelectedFilters] = useState<{
    status?: string[];
    conviteStatus?: string[];
    hasLogin?: boolean;
  }>({});

  const { dependents, stats, loading } = useAdminDependents(
    searchTerm,
    currentPage,
    itemsPerPage,
    selectedFilters
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-blue-400">TOTAL</div>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.total_dependentes || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">Dependentes</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-green-400">ATIVOS</div>
            <UserCheck className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.dependentes_ativos || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">Com acesso</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-yellow-400">PENDENTES</div>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.convites_pendentes || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">Convites</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-purple-400">COM LOGIN</div>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.com_login || 0}</div>
          <div className="text-xs text-zinc-500 mt-1">Autenticados</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar dependentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0A0F1C] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs lg:text-sm text-zinc-400">
              Total: <span className="text-white font-semibold">{dependents.length}</span>
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-[#0A0F1C] border border-white/10 rounded-lg px-3 lg:px-4 py-2 lg:py-3 text-white text-sm focus:outline-none focus:border-[#22C55E]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-white/5">
          <h2 className="text-lg lg:text-xl font-bold text-white">Lista de Dependentes</h2>
          <p className="text-xs lg:text-sm text-zinc-400 mt-1">
            Página {currentPage} ({stats?.total_dependentes || 0} total)
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">Carregando...</div>
        ) : dependents.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">Nenhum dependente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Dependente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Usuário Principal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Plano
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Convite
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Login
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dependents.map((dependent) => (
                  <tr key={dependent.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {getInitials(dependent.nome)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{dependent.nome}</div>
                          <div className="text-sm text-zinc-400">{dependent.email || "Sem email"}</div>
                          {dependent.telefone && (
                            <div className="text-xs text-zinc-500">{dependent.telefone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{dependent.principal_nome}</div>
                      <div className="text-sm text-zinc-400">ID: #{dependent.usuario_principal_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        dependent.principal_plano?.toLowerCase() === 'free' || !dependent.principal_plano
                          ? 'bg-zinc-500/20 text-zinc-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {dependent.principal_plano || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        dependent.status === 'ativo'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {dependent.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        dependent.convite_status === 'aceito'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {dependent.convite_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {dependent.auth_user_id ? (
                        <span className="text-green-400">✓</span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {formatDate(dependent.data_criacao)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-blue-400"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-blue-400"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {dependent.auth_user_id && (
                          <button
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-orange-400"
                            title="Resetar senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
