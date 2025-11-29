import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, UserPlus, Check, Trash2, CheckCheck, Share2, Video } from 'lucide-react';
import { useNotificationsStore } from '../store/notificationsStore';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Notification } from '../lib/supabase';

const typeIcons: Record<Notification['type'], any> = {
  comment: MessageSquare,
  assignment: UserPlus,
  status_change: Check,
  mention: MessageSquare,
  share: Share2,
  meeting_invite: Video,
};

const typeColors: Record<Notification['type'], string> = {
  comment: 'bg-blue-500',
  assignment: 'bg-green-500',
  status_change: 'bg-yellow-500',
  mention: 'bg-purple-500',
  share: 'bg-indigo-500',
  meeting_invite: 'bg-teal-500',
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    subscribeToNotifications 
  } = useNotificationsStore();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      const unsubscribe = subscribeToNotifications(user.id);
      return unsubscribe;
    }
  }, [user?.id, fetchNotifications, subscribeToNotifications]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    await markAsRead(notification.id);
    
    // Navegar según el tipo de notificación
    if (notification.type === 'meeting_invite') {
      navigate('/meetings');
    } else if (notification.type === 'share' || notification.personal_note_id) {
      navigate('/notepad');
    } else if (notification.note_id) {
      navigate(`/notes/${notification.note_id}`);
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-[#1e1e2e] text-gray-400 hover:text-white transition-colors"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#181825] rounded-xl border border-gray-700 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <CheckCheck size={14} />
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = typeIcons[notification.type];
                const bgColor = typeColors[notification.type];
                
                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 p-4 border-b border-gray-700/50 hover:bg-[#1e1e2e] cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-500/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm ${!notification.read ? 'text-white font-medium' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {format(new Date(notification.created_at), "d MMM 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
