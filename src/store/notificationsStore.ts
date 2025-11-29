import { create } from 'zustand';
import { supabase, isSupabaseConfigured, Notification } from '../lib/supabase';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.log('[Notifications] Supabase not configured');
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[Notifications] Fetching for user:', user?.id);
      
      if (!user) {
        console.log('[Notifications] No user logged in');
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          from_user:profiles!notifications_from_user_id_fkey(full_name, avatar_url)
        `)
        .eq('user_id', user.id) // Filtrar explícitamente por usuario
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[Notifications] Fetch result:', { data, error });

      if (error) throw error;
      
      const unreadCount = (data || []).filter(n => !n.read).length;
      set({ notifications: data || [], unreadCount, isLoading: false });
    } catch (error) {
      console.error('[Notifications] Error fetching:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      return;
    }

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
      return;
    }

    try {
      const { notifications } = get();
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .in('id', unreadIds);
      }

      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  deleteNotification: async (notificationId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: state.notifications.find(n => n.id === notificationId && !n.read) 
          ? state.unreadCount - 1 : state.unreadCount,
      }));
      return;
    }

    try {
      await supabase.from('notifications').delete().eq('id', notificationId);
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== notificationId),
        unreadCount: state.notifications.find(n => n.id === notificationId && !n.read) 
          ? state.unreadCount - 1 : state.unreadCount,
      }));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  subscribeToNotifications: (userId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return () => {};
    }

    let isSubscribed = false;
    
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          set((state) => ({
            notifications: [newNotification, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          }));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true;
        }
      });

    return () => {
      if (supabase && channel && isSubscribed) {
        supabase.removeChannel(channel);
      }
    };
  },
}));
