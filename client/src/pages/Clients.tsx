import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  Building2,
  Plus,
  Search,
  ChevronRight,
  Users,
  Truck,
  MapPin,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react';
import * as clientApi from '../api/client.api';
import { Client, ClientType } from '../types/client.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

type ViewFilter = 'all' | 'clients' | 'suppliers' | 'inactive';

const Clients = () => {
  const { t } = useTranslation('clients');
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC;

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
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await clientApi.deleteClient(id);
      setClients(clients.filter(c => c.id !== id));
    } catch (error: any) {
      alert(error.response?.data?.message || t('deleteError'));
    }
    setMenuOpenId(null);
  };

  const getClientTypeConfig = (type: ClientType) => {
    const configs = {
      client: { label: t('typeClient'), color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Users },
      supplier: { label: t('typeSupplier'), color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Truck },
      both: { label: t('typeBoth'), color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Building2 },
    };
    return configs[type];
  };

  // Filter clients based on view
  const filteredClients = clients.filter((client) => {
    if (viewFilter === 'all') return client.is_active;
    if (viewFilter === 'clients') return client.client_type === ClientType.CLIENT && client.is_active;
    if (viewFilter === 'suppliers') return (client.client_type === ClientType.SUPPLIER || client.client_type === ClientType.BOTH) && client.is_active;
    if (viewFilter === 'inactive') return !client.is_active;
    return true;
  });

  // Calculate summary stats
  const totalActive = clients.filter(c => c.is_active).length;
  const clientsCount = clients.filter(c => c.client_type === ClientType.CLIENT && c.is_active).length;
  const suppliersCount = clients.filter(c => (c.client_type === ClientType.SUPPLIER || c.client_type === ClientType.BOTH) && c.is_active).length;
  const inactiveCount = clients.filter(c => !c.is_active).length;

  const viewTabs = [
    { key: 'all', label: t('all'), count: totalActive },
    { key: 'clients', label: t('clients'), count: clientsCount },
    { key: 'suppliers', label: t('suppliers'), count: suppliersCount },
    { key: 'inactive', label: t('inactive'), count: inactiveCount },
  ];

  return (
    <MainLayout title={t('title')}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('newClient')}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalActive}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalActive')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{clientsCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('clients')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{suppliersCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('suppliers')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{inactiveCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('inactive')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewFilter(tab.key as ViewFilter)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewFilter === tab.key
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  viewFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {viewFilter !== 'all' ? t('noClientsInCategory') : t('noClients')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {viewFilter !== 'all' ? t('changeFilter') : t('createFirst')}
          </p>
          {canEdit && (
            <button
              onClick={() => navigate('/clients/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('createClient')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-4">{t('client')}</div>
            <div className="col-span-2">{t('type')}</div>
            <div className="col-span-3">{t('contact')}</div>
            <div className="col-span-2">{t('location')}</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredClients.map((client) => {
              const typeConfig = getClientTypeConfig(client.client_type);
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={client.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group items-center"
                >
                  {/* Client Info */}
                  <div
                    className="col-span-4 flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-300">
                        {client.name}
                      </h3>
                      {client.nip && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          NIP: {client.nip}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${typeConfig.color}`}>
                      <TypeIcon className="w-3 h-3" />
                      {typeConfig.label}
                    </span>
                  </div>

                  {/* Contact */}
                  <div className="col-span-3 space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="w-3 h-3" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="col-span-2">
                    {client.city && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span>{client.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end relative">
                    {canEdit ? (
                      <>
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpenId === client.id && (
                          <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                navigate(`/clients/${client.id}/edit`);
                              }}
                              className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              {t('edit')}
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('delete')}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('shown', { shown: filteredClients.length, total: clients.length })}
        </div>
      )}
    </MainLayout>
  );
};

export default Clients;
