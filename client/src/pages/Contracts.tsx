import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  FileSignature,
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import * as contractApi from '../api/contract.api';
import {
  Contract,
  ContractStatus,
  CONTRACT_STATUS_LABELS,
} from '../types/contract.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

type ViewFilter = 'all' | 'draft' | 'pending' | 'active' | 'expired' | 'terminated';

const Contracts = () => {
  const { t } = useTranslation('contracts');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC;

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setIsLoading(true);
      const data = await contractApi.getAllContracts();
      setContracts(data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await contractApi.deleteContract(id);
      setContracts(contracts.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || t('deleteError'));
    }
    setMenuOpenId(null);
  };

  const formatMoney = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiration = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusConfig = (status: ContractStatus) => {
    const configs: Record<ContractStatus, { label: string; color: string; dot: string }> = {
      [ContractStatus.DRAFT]: {
        label: CONTRACT_STATUS_LABELS[ContractStatus.DRAFT],
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        dot: 'bg-slate-400',
      },
      [ContractStatus.PENDING]: {
        label: CONTRACT_STATUS_LABELS[ContractStatus.PENDING],
        color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dot: 'bg-amber-500',
      },
      [ContractStatus.ACTIVE]: {
        label: CONTRACT_STATUS_LABELS[ContractStatus.ACTIVE],
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500',
      },
      [ContractStatus.EXPIRED]: {
        label: CONTRACT_STATUS_LABELS[ContractStatus.EXPIRED],
        color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500',
      },
      [ContractStatus.TERMINATED]: {
        label: CONTRACT_STATUS_LABELS[ContractStatus.TERMINATED],
        color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
        dot: 'bg-gray-400',
      },
      [ContractStatus.RENEWED]: {
        label: CONTRACT_STATUS_LABELS[ContractStatus.RENEWED],
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        dot: 'bg-blue-500',
      },
    };
    return configs[status];
  };

  // Filter contracts
  const filteredContracts = contracts.filter((contract) => {
    const matchesFilter =
      viewFilter === 'all' ||
      contract.status === viewFilter;

    const matchesSearch =
      !searchQuery ||
      contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Stats
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) => c.status === ContractStatus.ACTIVE).length;
  const expiringContracts = contracts.filter(
    (c) => c.status === ContractStatus.ACTIVE && getDaysUntilExpiration(c.end_date) <= 30
  ).length;

  const viewTabs = [
    { key: 'all', label: t('all'), count: totalContracts },
    { key: 'active', label: CONTRACT_STATUS_LABELS[ContractStatus.ACTIVE], count: activeContracts },
    { key: 'draft', label: CONTRACT_STATUS_LABELS[ContractStatus.DRAFT], count: contracts.filter((c) => c.status === ContractStatus.DRAFT).length },
    { key: 'pending', label: CONTRACT_STATUS_LABELS[ContractStatus.PENDING], count: contracts.filter((c) => c.status === ContractStatus.PENDING).length },
    { key: 'expired', label: CONTRACT_STATUS_LABELS[ContractStatus.EXPIRED], count: contracts.filter((c) => c.status === ContractStatus.EXPIRED).length },
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
            onClick={() => navigate('/contracts/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('newContract')}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalContracts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalContracts')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{activeContracts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('active')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{expiringContracts}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('expiringSoon')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewFilter(tab.key as ViewFilter)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Contracts List */}
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
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileSignature className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {viewFilter !== 'all' || searchQuery ? t('noContractsFiltered') : t('noContracts')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {viewFilter !== 'all' || searchQuery ? t('changeFilter') : t('createFirst')}
          </p>
          {canEdit && !searchQuery && viewFilter === 'all' && (
            <button
              onClick={() => navigate('/contracts/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('newContract')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-3">{t('contract')}</div>
            <div className="col-span-2">{t('client')}</div>
            <div className="col-span-2">{t('status')}</div>
            <div className="col-span-2">{t('dates')}</div>
            <div className="col-span-2">{t('value')}</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredContracts.map((contract) => {
              const statusConfig = getStatusConfig(contract.status);
              const daysUntilExpiration = getDaysUntilExpiration(contract.end_date);
              const isExpiringSoon =
                contract.status === ContractStatus.ACTIVE && daysUntilExpiration <= 30;

              return (
                <div
                  key={contract.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group items-center"
                >
                  {/* Contract Info */}
                  <div
                    className="col-span-3 flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/contracts/${contract.id}`)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <FileSignature className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-300">
                          {contract.contract_number}
                        </h3>
                        {isExpiringSoon && (
                          <span title={t('expiringSoon')}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {contract.title}
                      </p>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {contract.client?.name || '-'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDate(contract.start_date)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {contract.status === ContractStatus.ACTIVE && daysUntilExpiration > 0
                        ? `${daysUntilExpiration} ${t('daysRemaining')}`
                        : formatDate(contract.end_date)}
                    </p>
                  </div>

                  {/* Value */}
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatMoney(contract.value, contract.currency)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end relative">
                    {canEdit ? (
                      <>
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === contract.id ? null : contract.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpenId === contract.id && (
                          <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                navigate(`/contracts/${contract.id}`);
                              }}
                              className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              {t('view')}
                            </button>
                            {contract.status !== ContractStatus.TERMINATED && (
                              <button
                                onClick={() => {
                                  setMenuOpenId(null);
                                  navigate(`/contracts/${contract.id}/edit`);
                                }}
                                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                {t('edit')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(contract.id)}
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
      {!isLoading && filteredContracts.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('shown', { shown: filteredContracts.length, total: contracts.length })}
        </div>
      )}
    </MainLayout>
  );
};

export default Contracts;
