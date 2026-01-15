import { Phone, PhoneOff, Video, User } from 'lucide-react';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string;
  meetingTitle: string;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal = ({
  callerName,
  callerAvatar,
  meetingTitle,
  onAccept,
  onReject,
}: IncomingCallModalProps) => {
  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce-in">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-800 w-96 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-3">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            <span className="font-semibold">Przychodzące połączenie</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Caller Info */}
          <div className="flex flex-col items-center mb-6">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="w-20 h-20 rounded-full mb-3 border-4 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full mb-3 bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                <User className="w-10 h-10 text-gray-500" />
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-1">{callerName}</h3>
            <p className="text-sm text-gray-600">{meetingTitle}</p>
          </div>

          {/* Ringing Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-gray-800 animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              Odrzuć
            </button>
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Phone className="w-5 h-5" />
              Odbierz
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.3) translateY(-100px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;
