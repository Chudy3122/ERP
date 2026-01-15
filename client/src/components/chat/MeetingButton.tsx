import React, { useState } from 'react';
import * as meetingApi from '../../api/meeting.api';
import { MeetingPlatform } from '../../api/meeting.api';

interface MeetingButtonProps {
  onMeetingGenerated: (formattedMessage: string) => void;
  disabled?: boolean;
}

const MeetingButton: React.FC<MeetingButtonProps> = ({ onMeetingGenerated, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');

  const handleGenerateMeeting = async () => {
    try {
      setIsGenerating(true);
      const meetingLink = await meetingApi.generateMeetingLink({
        platform: MeetingPlatform.JITSI,
        title: meetingTitle.trim() || undefined,
      });

      if (meetingLink.formattedMessage) {
        onMeetingGenerated(meetingLink.formattedMessage);
      }

      // Reset and close
      setMeetingTitle('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to generate meeting link:', error);
      alert('Nie udało się wygenerować linku do spotkania');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Utwórz spotkanie video"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Modal */}
          <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Utwórz spotkanie video
              </h3>
              <p className="text-sm text-gray-600">Jitsi Meet - darmowe, osadzone wideo</p>
            </div>

            {/* Meeting Title Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tytuł spotkania (opcjonalnie)
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="np. Spotkanie zespołu"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isGenerating}
              />
            </div>

            {/* Info Box */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-800">
                Spotkanie zostanie otwarte bezpośrednio w aplikacji
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleGenerateMeeting}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Generowanie...</span>
                  </>
                ) : (
                  <>
                    <span>Utwórz link</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MeetingButton;
