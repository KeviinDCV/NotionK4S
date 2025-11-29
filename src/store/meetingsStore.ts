import { create } from 'zustand';
import { supabase, isSupabaseConfigured, Meeting, MeetingParticipant, createNotification } from '../lib/supabase';

interface MeetingsState {
  meetings: Meeting[];
  isLoading: boolean;
  
  fetchMeetings: () => Promise<void>;
  createMeeting: (meeting: Partial<Meeting>, participantIds: string[]) => Promise<{ error: string | null; meeting?: Meeting }>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<{ error: string | null }>;
  deleteMeeting: (id: string) => Promise<{ error: string | null }>;
  updateMeetingStatus: (id: string, status: Meeting['status']) => Promise<{ error: string | null }>;
  inviteParticipant: (meetingId: string, userId: string) => Promise<{ error: string | null }>;
  removeParticipant: (meetingId: string, userId: string) => Promise<{ error: string | null }>;
  updateParticipantStatus: (meetingId: string, status: MeetingParticipant['status']) => Promise<{ error: string | null }>;
}

const generateId = () => `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateRoomName = () => `k4s-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

export const useMeetingsStore = create<MeetingsState>((set) => ({
  meetings: [],
  isLoading: false,

  fetchMeetings: async () => {
    set({ isLoading: true });
    
    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          creator:profiles!created_by(id, full_name, email, avatar_url),
          participants:meeting_participants(
            *,
            user:profiles!user_id(id, full_name, email, avatar_url)
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      set({ meetings: data || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching meetings:', error);
      set({ isLoading: false });
    }
  },

  createMeeting: async (meeting, participantIds) => {
    if (!isSupabaseConfigured || !supabase) {
      const newMeeting: Meeting = {
        id: generateId(),
        title: meeting.title || 'Nueva reunión',
        description: meeting.description,
        room_name: generateRoomName(),
        scheduled_at: meeting.scheduled_at || new Date().toISOString(),
        duration_minutes: meeting.duration_minutes || 60,
        created_by: meeting.created_by || 'demo-user',
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((state) => ({ meetings: [...state.meetings, newMeeting] }));
      return { error: null, meeting: newMeeting };
    }

    try {
      const roomName = generateRoomName();
      const { data, error } = await supabase
        .from('meetings')
        .insert([{
          ...meeting,
          room_name: roomName,
        }])
        .select()
        .single();

      if (error) return { error: error.message };

      // Agregar participantes
      if (participantIds.length > 0) {
        const participants = participantIds.map(userId => ({
          meeting_id: data.id,
          user_id: userId,
          status: 'invited',
        }));
        await supabase.from('meeting_participants').insert(participants);

        // Enviar notificaciones a todos los participantes
        const currentUser = (await supabase.auth.getUser()).data.user;
        for (const participantId of participantIds) {
          await createNotification({
            userId: participantId,
            type: 'meeting_invite',
            title: 'Invitación a reunión',
            message: `Te han invitado a la reunión "${data.title}"`,
            meetingId: data.id,
            fromUserId: currentUser?.id,
          });
        }
      }

      set((state) => ({ meetings: [...state.meetings, data] }));
      return { error: null, meeting: data };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateMeeting: async (id, updates) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        meetings: state.meetings.map((m) =>
          m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
        ),
      }));
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) return { error: error.message };

      set((state) => ({
        meetings: state.meetings.map((m) =>
          m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
        ),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  deleteMeeting: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
      }));
      return { error: null };
    }

    try {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) return { error: error.message };

      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateMeetingStatus: async (id, status) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        meetings: state.meetings.map((m) =>
          m.id === id ? { ...m, status } : m
        ),
      }));
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('meetings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) return { error: error.message };

      set((state) => ({
        meetings: state.meetings.map((m) =>
          m.id === id ? { ...m, status } : m
        ),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  inviteParticipant: async (meetingId, userId) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .insert([{ meeting_id: meetingId, user_id: userId, status: 'invited' }]);

      if (error) return { error: error.message };

      // Obtener info de la reunión y enviar notificación
      const currentUser = (await supabase.auth.getUser()).data.user;
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('title')
        .eq('id', meetingId)
        .single();

      if (currentUser && meetingData) {
        await createNotification({
          userId: userId,
          type: 'meeting_invite',
          title: 'Invitación a reunión',
          message: `Te han invitado a la reunión "${meetingData.title}"`,
          meetingId: meetingId,
          fromUserId: currentUser.id,
        });
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  removeParticipant: async (meetingId, userId) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', meetingId)
        .eq('user_id', userId);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateParticipantStatus: async (meetingId, status) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const updates: any = { status };
      
      if (status === 'joined') {
        updates.joined_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('meeting_participants')
        .update(updates)
        .eq('meeting_id', meetingId)
        .eq('user_id', userId);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },
}));
