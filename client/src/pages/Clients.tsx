import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { confirmDelete } from '../utils/confirm';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import * as clientApi from '../api/client.api';
import { Client, ClientType } from '../types/client.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

type ViewFilter = 'all' | 'clients' | 'suppliers' | 'inactive';

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const Clients = () => {
  const { t } = useTranslation('clients');
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC || user?.role === UserRole.SEKRETARIAT;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const result = await clientApi.getClients({
        search: searchQuery || undefined,
      });
      setClients(result.clients);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadClients();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete(t('confirmDelete')))) return;

    try {
      await clientApi.deleteClient(id);
      setClients(clients.filter((client) => client.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('deleteError'));
    }
    setMenuOpenId(null);
  };

  const getClientTypeConfig = (type: ClientType) => {
    const configs = {
      client: {
        label: t('typeClient'),
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        icon: Users,
      },
      supplier: {
        label: t('typeSupplier'),
        color: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
        icon: Truck,
      },
      both: {
        label: t('typeBoth'),
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        icon: Building2,
      },
    };
    return configs[type];
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (viewFilter === 'all') return client.is_active;
      if (viewFilter === 'clients') return client.client_type === ClientType.CLIENT && client.is_active;
      if (viewFilter === 'suppliers') {
        return (client.client_type === ClientType.SUPPLIER || client.client_type === ClientType.BOTH) && client.is_active;
      }
      if (viewFilter === 'inactive') return !client.is_active;
      return true;
    });
  }, [clients, viewFilter]);

  const totalActive = clients.filter((client) => client.is_active).length;
  const clientsCount = clients.filter((client) => client.client_type === ClientType.CLIENT && client.is_active).length;
  const suppliersCount = clients.filter(
    (client) => (client.client_type === ClientType.SUPPLIER || client.client_type === ClientType.BOTH) && client.is_active,
  ).length;
  const inactiveCount = clients.filter((client) => !client.is_active).length;

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredClients.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredClients.length);
  const paginatedClients = filteredClients.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const viewTabs = [
    { key: 'all', label: t('all'), count: totalActive },
    { key: 'clients', label: t('clients'), count: clientsCount },
    { key: 'suppliers', label: t('suppliers'), count: suppliersCount },
    { key: 'inactive', label: t('inactive'), count: inactiveCount },
  ];

  const statCards = [
    {
      label: t('totalActive'),
      value: totalActive,
      icon: Building2,
      iconClass: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
    },
    {
      label: t('clients'),
      value: clientsCount,
      icon: Users,
      iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      label: t('suppliers'),
      value: suppliersCount,
      icon: Truck,
      iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      label: t('inactive'),
      value: inactiveCount,
      icon: Building2,
      iconClass: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
    },
  ];

  return (
    <MainLayout title={t('title')}>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                Baza kontrahentów
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">{t('title')}</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
                </div>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => navigate('/clients/new')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
              >
                <Plus className="h-4 w-4" />
                {t('newClient')}
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-950 dark:text-white">{card.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-700 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {viewTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setViewFilter(tab.key as ViewFilter);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    viewFilter === tab.key
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      viewFilter === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative w-full sm:min-w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Szukaj
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-9 w-9 animate-spin text-[#F7941D]" />
                <span className="text-sm font-medium">Ładowanie kontrahentów...</span>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <Building2 className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">
                {viewFilter !== 'all' ? t('noClientsInCategory') : t('noClients')}
              </h3>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                {viewFilter !== 'all' ? t('changeFilter') : t('createFirst')}
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate('/clients/new')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                >
                  <Plus className="h-4 w-4" />
                  {t('createClient')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('client')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('type')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('contact')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('location')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedClients.map((client) => {
                      const typeConfig = getClientTypeConfig(client.client_type);
                      const TypeIcon = typeConfig.icon;

                      return (
                        <tr
                          key={client.id}
                          className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                        >
                          <td className="min-w-[300px] px-4 py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              className="flex min-w-0 items-center gap-3 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-950 transition-colors group-hover:text-[#F7941D] dark:text-white">
                                  {client.name}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  {client.nip ? `NIP: ${client.nip}` : 'Brak numeru NIP'}
                                </p>
                              </div>
                            </button>
                          </td>
                          <td className="min-w-[170px] px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${typeConfig.color}`}
                            >
                              <TypeIcon className="h-3.5 w-3.5" />
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="min-w-[260px] px-4 py-4">
                            <div className="space-y-1">
                              {client.email && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{client.email}</span>
                                </div>
                              )}
                              {client.phone && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span>{client.phone}</span>
                                </div>
                              )}
                              {!client.email && !client.phone && (
                                <span className="text-sm text-gray-400 dark:text-gray-500">Brak danych kontaktowych</span>
                              )}
                            </div>
                          </td>
                          <td className="min-w-[180px] px-4 py-4">
                            {client.city ? (
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{client.city}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">Brak lokalizacji</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="relative flex items-center justify-end">
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    aria-label="Menu kontrahenta"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {menuOpenId === client.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                                      <div className="absolute right-0 top-9 z-20 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuOpenId(null);
                                            navigate(`/clients/${client.id}/edit`);
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          <Edit className="h-4 w-4" />
                                          {t('edit')}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(client.id)}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          {t('delete')}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/clients/${client.id}`)}
                                  className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700"
                                  aria-label="Przejdź do kontrahenta"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  Pokazano {pageStart}-{pageEnd} z {filteredClients.length} kontrahentów
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>Na stronie</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-medium text-gray-700 dark:text-gray-200">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default Clients;
