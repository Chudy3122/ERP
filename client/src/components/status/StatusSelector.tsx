import React, { useState, useEffect, useRef } from 'react';
import { StatusType, STATUS_LABELS, STATUS_COLORS } from '../../types/status.types';
import * as statusApi from '../../api/status.api';

interface StatusSelectorProps {
  currentStatus?: StatusType;
  onStatusChange?: (status: StatusType, customMessage?: string) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<StatusType>(StatusType.OFFLINE);
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load current user status on mount
  useEffect(() => {
    const loadCurrentStatus = async () => {
      try {
        const userStatus = await statusApi.getMyStatus();
        setStatus(userStatus.status);
        setCustomMessage(userStatus.custom_message || '');
      } catch (error) {
        console.error('Failed to load status:', error);
      }
    };

    if (currentStatus) {
      setStatus(currentStatus);
    } else {
      loadCurrentStatus();
    }
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
        className="w-full flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`}></div>
        <span className="text-gray-700 font-medium text-sm flex-1 text-left">{STATUS_LABELS[status]}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-md border border-gray-200 overflow-hidden z-[100] shadow-xl">
          {!showMessageInput ? (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wide">
                Ustaw status
              </div>
              {statusOptions.map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => handleStatusSelect(statusOption)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors hover:bg-gray-100 ${
                    status === statusOption ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[statusOption]}`}></div>
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {statusOption === StatusType.ONLINE && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    {statusOption === StatusType.AWAY && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    {statusOption === StatusType.BUSY && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />}
                    {statusOption === StatusType.IN_MEETING && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 005 0" />}
                    {statusOption === StatusType.OFFLINE && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />}
                  </svg>
                  <span className="text-sm font-medium text-gray-900 flex-1 text-left">
                    {STATUS_LABELS[statusOption]}
                  </span>
                  {status === statusOption && (
                    <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
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
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-900 transition-colors text-sm"
                >
                  Zapisz
                </button>
                <button
                  onClick={() => {
                    setShowMessageInput(false);
                    setCustomMessage('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300 transition-colors text-sm"
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
