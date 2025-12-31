import React, { useState, useEffect, useRef } from 'react';
import { StatusType, STATUS_LABELS, STATUS_EMOJI, STATUS_COLORS } from '../../types/status.types';
import * as statusApi from '../../api/status.api';

interface StatusSelectorProps {
  currentStatus?: StatusType;
  onStatusChange?: (status: StatusType, customMessage?: string) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus = StatusType.OFFLINE, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<StatusType>(currentStatus);
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowMessageInput(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStatusSelect = async (newStatus: StatusType) => {
    // Show message input for Away, Busy, and In Meeting
    if ([StatusType.AWAY, StatusType.BUSY, StatusType.IN_MEETING].includes(newStatus)) {
      setShowMessageInput(true);
      setStatus(newStatus);
      return;
    }

    // Directly set status for Online and Offline
    setStatus(newStatus);
    setIsOpen(false);

    try {
      let updatedStatus;
      switch (newStatus) {
        case StatusType.ONLINE:
          updatedStatus = await statusApi.setStatusOnline();
          break;
        case StatusType.OFFLINE:
          updatedStatus = await statusApi.setStatusOffline();
          break;
        default:
          updatedStatus = await statusApi.updateMyStatus({ status: newStatus });
      }

      if (onStatusChange) {
        onStatusChange(updatedStatus.status);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSaveWithMessage = async () => {
    try {
      const updatedStatus = await statusApi.updateMyStatus({
        status,
        custom_message: customMessage || undefined,
      });

      if (onStatusChange) {
        onStatusChange(updatedStatus.status, updatedStatus.custom_message || undefined);
      }

      setIsOpen(false);
      setShowMessageInput(false);
      setCustomMessage('');
    } catch (error) {
      console.error('Failed to update status with message:', error);
    }
  };

  const statusOptions = [
    StatusType.ONLINE,
    StatusType.AWAY,
    StatusType.BUSY,
    StatusType.IN_MEETING,
    StatusType.OFFLINE,
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 border border-white/20 shadow-lg hover:shadow-xl"
      >
        <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]} shadow-sm animate-pulse`}></div>
        <span className="text-white font-medium text-sm">{STATUS_LABELS[status]}</span>
        <svg
          className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          {!showMessageInput ? (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wide">
                Ustaw status
              </div>
              {statusOptions.map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => handleStatusSelect(statusOption)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 group ${
                    status === statusOption ? 'bg-gradient-to-r from-indigo-50 to-purple-50' : ''
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[statusOption]} shadow-sm ${
                    statusOption === StatusType.ONLINE ? 'animate-pulse' : ''
                  }`}></div>
                  <span className="text-2xl">{STATUS_EMOJI[statusOption]}</span>
                  <span className="text-sm font-medium text-gray-900 flex-1 text-left">
                    {STATUS_LABELS[statusOption]}
                  </span>
                  {status === statusOption && (
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${STATUS_COLORS[status]}`}></div>
                <h3 className="font-semibold text-gray-900">{STATUS_LABELS[status]}</h3>
              </div>
              <input
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Dodaj wiadomość (opcjonalnie)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm mb-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveWithMessage();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveWithMessage}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 text-sm"
                >
                  Zapisz
                </button>
                <button
                  onClick={() => {
                    setShowMessageInput(false);
                    setCustomMessage('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusSelector;
