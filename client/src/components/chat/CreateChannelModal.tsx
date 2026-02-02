import React, { useState } from 'react';
import { ChannelType } from '../../types/chat.types';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; type: ChannelType; description?: string }) => Promise<void>;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>(ChannelType.GROUP);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nazwa kanału jest wymagana');
      return;
    }

    try {
      setLoading(true);
      await onCreate({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      });
      // Reset form
      setName('');
      setType(ChannelType.GROUP);
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Nie udało się utworzyć kanału');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setType(ChannelType.GROUP);
      setDescription('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 p-6 rounded-t-md border-b border-blue-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Utwórz nowy kanał</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Channel Name */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Nazwa kanału *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Marketing, Projekty, Ogłoszenia"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={loading}
              required
            />
          </div>

          {/* Channel Type */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Typ kanału *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType(ChannelType.GROUP)}
                disabled={loading}
                className={`p-3 rounded-md border-2 transition-colors ${
                  type === ChannelType.GROUP
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div className="text-xs font-medium">Grupowy</div>
              </button>
              <button
                type="button"
                onClick={() => setType(ChannelType.PUBLIC)}
                disabled={loading}
                className={`p-3 rounded-md border-2 transition-colors ${
                  type === ChannelType.PUBLIC
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <div className="text-xs font-medium">Publiczny</div>
              </button>
              <button
                type="button"
                onClick={() => setType(ChannelType.PRIVATE)}
                disabled={loading}
                className={`p-3 rounded-md border-2 transition-colors ${
                  type === ChannelType.PRIVATE
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="text-xs font-medium">Prywatny</div>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
              Opis (opcjonalny)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krótki opis celu kanału..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Tworzenie...
                </span>
              ) : (
                'Utwórz kanał'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
