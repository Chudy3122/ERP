import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Loader2,
  Calendar,
  Building2,
  DollarSign,
  RefreshCw,
  Upload,
  File,
  X,
  FileSignature,
} from 'lucide-react';
import * as contractApi from '../api/contract.api';
import {
  Contract,
  ContractStatus,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
} from '../types/contract.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';
import { getFileUrl } from '../api/axios-config';

const ContractDetail = () => {
  const { t } = useTranslation('contracts');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null);

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC;

  useEffect(() => {
    if (id) {
      loadContract();
    }
  }, [id]);

  const loadContract = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await contractApi.getContractById(id);
      setContract(data);
    } catch (err) {
      console.error('Failed to load contract:', err);
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contract || !confirm(t('confirmDelete'))) return;

    try {
      await contractApi.deleteContract(contract.id);
      navigate('/contracts');
    } catch (err: any) {
      alert(err.response?.data?.message || t('deleteError'));
    }
  };

  const handleStatusChange = async (newStatus: ContractStatus) => {
    if (!contract) return;

    try {
      await contractApi.updateContractStatus(contract.id, newStatus);
      loadContract();
    } catch (err: any) {
      alert(err.response?.data?.message || t('statusError'));
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract) return;

    try {
      setIsDownloading(true);
      const blob = await contractApi.downloadContractPdf(contract.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contract.contract_number.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || t('pdfError'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!contract || !e.target.files?.length) return;

    const file = e.target.files[0];

    try {
      setIsUploading(true);
      await contractApi.uploadContractAttachment(contract.id, file);
      loadContract();
    } catch (err: any) {
      alert(err.response?.data?.message || t('uploadError'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!contract || !confirm(t('confirmDeleteAttachment'))) return;

    try {
      setIsDeletingAttachment(attachmentId);
      await contractApi.deleteContractAttachment(contract.id, attachmentId);
      loadContract();
    } catch (err: any) {
      alert(err.response?.data?.message || t('deleteAttachmentError'));
    } finally {
      setIsDeletingAttachment(null);
    }
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
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDaysUntilExpiration = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadgeClasses = (status: ContractStatus) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return colorMap[CONTRACT_STATUS_COLORS[status]] || colorMap.gray;
  };

  if (isLoading) {
    return (
      <MainLayout title={t('contractDetails')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  if (error || !contract) {
    return (
      <MainLayout title={t('contractDetails')}>
        <div className="text-center py-12">
          <FileSignature className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{error || t('notFound')}</h3>
        </div>
      </MainLayout>
    );
  }

  const daysUntilExpiration = getDaysUntilExpiration(contract.end_date);

  return (
    <MainLayout title={contract.contract_number}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/contracts')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {contract.contract_number}
              </h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClasses(contract.status)}`}>
                {CONTRACT_STATUS_LABELS[contract.status]}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{contract.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('downloadPdf')}
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
              >
                <Edit className="w-4 h-4" />
                {t('edit')}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Dates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client */}
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('client')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {contract.client?.name || '-'}
                  </p>
                  {contract.client?.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contract.client.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('dates')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                  </p>
                  {contract.status === ContractStatus.ACTIVE && (
                    <p
                      className={`text-sm ${
                        daysUntilExpiration <= 30
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {daysUntilExpiration > 0
                        ? `${daysUntilExpiration} ${t('daysRemaining')}`
                        : t('expired')}
                    </p>
                  )}
                </div>
              </div>

              {/* Value */}
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('value')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatMoney(contract.value, contract.currency)}
                  </p>
                </div>
              </div>

              {/* Auto Renew */}
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('autoRenew')}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {contract.auto_renew ? t('yes') : t('no')}
                    {contract.auto_renew && ` (${contract.renewal_notice_days} ${t('daysNotice')})`}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {contract.description && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('description')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {contract.description}
                </p>
              </div>
            )}

            {/* Payment Terms */}
            {contract.payment_terms && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('paymentTerms')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {contract.payment_terms}
                </p>
              </div>
            )}

            {/* Notes */}
            {contract.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('notes')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {contract.notes}
                </p>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('attachments')}
              </h3>
              {canEdit && (
                <label className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg cursor-pointer transition-colors font-medium">
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {t('uploadFile')}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {contract.attachments && contract.attachments.length > 0 ? (
              <div className="space-y-2">
                {contract.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <div>
                        <a
                          href={getFileUrl(attachment.file_url) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 dark:text-white hover:underline"
                        >
                          {attachment.original_name}
                        </a>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(attachment.file_size)} •{' '}
                          {formatDate(attachment.created_at)}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        disabled={isDeletingAttachment === attachment.id}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        {isDeletingAttachment === attachment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('noAttachments')}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {canEdit && contract.status !== ContractStatus.TERMINATED && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('changeStatus')}
              </h3>
              <div className="space-y-2">
                {contract.status === ContractStatus.DRAFT && (
                  <>
                    <button
                      onClick={() => handleStatusChange(ContractStatus.PENDING)}
                      className="w-full px-4 py-2 text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                    >
                      {t('markAsPending')}
                    </button>
                    <button
                      onClick={() => handleStatusChange(ContractStatus.ACTIVE)}
                      className="w-full px-4 py-2 text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                    >
                      {t('markAsActive')}
                    </button>
                  </>
                )}
                {contract.status === ContractStatus.PENDING && (
                  <button
                    onClick={() => handleStatusChange(ContractStatus.ACTIVE)}
                    className="w-full px-4 py-2 text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                  >
                    {t('markAsActive')}
                  </button>
                )}
                {contract.status === ContractStatus.ACTIVE && (
                  <button
                    onClick={() => handleStatusChange(ContractStatus.RENEWED)}
                    className="w-full px-4 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    {t('markAsRenewed')}
                  </button>
                )}
                {(contract.status === ContractStatus.ACTIVE ||
                  contract.status === ContractStatus.PENDING) && (
                  <button
                    onClick={() => handleStatusChange(ContractStatus.TERMINATED)}
                    className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {t('markAsTerminated')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {contract.internal_notes && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('internalNotes')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {contract.internal_notes}
              </p>
            </div>
          )}

          {/* Meta Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('metaInfo')}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('createdBy')}</span>
                <span className="text-gray-900 dark:text-white">
                  {contract.creator
                    ? `${contract.creator.first_name} ${contract.creator.last_name}`
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('createdAt')}</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(contract.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">{t('updatedAt')}</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(contract.updated_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContractDetail;
