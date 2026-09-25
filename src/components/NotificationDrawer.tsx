import React from 'react';
import { AppNotification } from '../types';
import { Bell, Check, X, Clock } from 'lucide-react';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkRead
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#2d3a2d]/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-[#fdfcf9] w-full max-w-sm h-full shadow-2xl border-l border-[#d9d4c1] p-6 space-y-4 overflow-y-auto animate-in slide-in-from-right duration-200">
        
        <div className="flex items-center justify-between border-b border-[#e5e1cc] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#5d7a5c]" />
            <h3 className="font-serif italic font-bold text-[#2d3a2d] text-xl">Notifications</h3>
          </div>
          <button onClick={onClose} className="text-[#7a8a7a] hover:text-[#2d3a2d] text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-[#7a8a7a] space-y-2">
            <Bell className="w-8 h-8 mx-auto opacity-50 text-[#5d7a5c]" />
            <p className="text-xs">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                className={`p-3.5 rounded-2xl border text-xs space-y-1 transition cursor-pointer ${
                  n.read ? 'bg-white border-[#e5e1cc] text-[#7a8a7a]' : 'bg-[#f2f0e4] border-[#d9d4c1] text-[#2d3a2d] font-semibold'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{n.title}</span>
                  <span className="text-[10px] text-[#7a8a7a] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-[#3a4439]">{n.message}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
