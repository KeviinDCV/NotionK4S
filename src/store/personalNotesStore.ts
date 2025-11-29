import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured, PersonalNote, PersonalNoteShare, createNotification } from '../lib/supabase';

interface PersonalNotesState {
  notes: PersonalNote[];
  sharedWithMe: PersonalNote[];
  isLoading: boolean;
  
  fetchNotes: () => Promise<void>;
  createNote: (title: string, content?: string) => Promise<{ error: string | null; note?: PersonalNote }>;
  updateNote: (id: string, updates: Partial<PersonalNote>) => Promise<{ error: string | null }>;
  deleteNote: (id: string) => Promise<{ error: string | null }>;
  shareNote: (noteId: string, userId: string, canEdit: boolean) => Promise<{ error: string | null }>;
  unshareNote: (noteId: string, userId: string) => Promise<{ error: string | null }>;
  getShares: (noteId: string) => Promise<PersonalNoteShare[]>;
}

const generateId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const usePersonalNotesStore = create<PersonalNotesState>()(
  persist(
    (set) => ({
      notes: [],
      sharedWithMe: [],
      isLoading: false,

      fetchNotes: async () => {
        if (!isSupabaseConfigured || !supabase) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          // Notas propias
          const { data: ownNotes, error: ownError } = await supabase
            .from('personal_notes')
            .select('*, owner:profiles!owner_id(id, full_name, email, avatar_url)')
            .order('updated_at', { ascending: false });

          if (ownError) throw ownError;

          // Separar notas propias y compartidas
          const userId = (await supabase.auth.getUser()).data.user?.id;
          const myNotes = ownNotes?.filter(n => n.owner_id === userId) || [];
          const sharedNotes = ownNotes?.filter(n => n.owner_id !== userId) || [];

          set({ 
            notes: myNotes, 
            sharedWithMe: sharedNotes,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error fetching personal notes:', error);
          set({ isLoading: false });
        }
      },

      createNote: async (title, content = '') => {
        if (!isSupabaseConfigured || !supabase) {
          const newNote: PersonalNote = {
            id: generateId(),
            title,
            content,
            owner_id: 'demo-user',
            is_shared: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set((state) => ({ notes: [newNote, ...state.notes] }));
          return { error: null, note: newNote };
        }

        try {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          const { data, error } = await supabase
            .from('personal_notes')
            .insert([{ title, content, owner_id: userId }])
            .select()
            .single();

          if (error) return { error: error.message };
          set((state) => ({ notes: [data, ...state.notes] }));
          return { error: null, note: data };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      updateNote: async (id, updates) => {
        if (!isSupabaseConfigured || !supabase) {
          set((state) => ({
            notes: state.notes.map((n) => 
              n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
            ),
            sharedWithMe: state.sharedWithMe.map((n) =>
              n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
            ),
          }));
          return { error: null };
        }

        try {
          const { error } = await supabase
            .from('personal_notes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) return { error: error.message };
          
          set((state) => ({
            notes: state.notes.map((n) => 
              n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
            ),
            sharedWithMe: state.sharedWithMe.map((n) =>
              n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
            ),
          }));
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      deleteNote: async (id) => {
        if (!isSupabaseConfigured || !supabase) {
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
          }));
          return { error: null };
        }

        try {
          const { error } = await supabase
            .from('personal_notes')
            .delete()
            .eq('id', id);

          if (error) return { error: error.message };
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
          }));
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      shareNote: async (noteId, userId, canEdit) => {
        if (!isSupabaseConfigured || !supabase) {
          return { error: null };
        }

        try {
          const { error } = await supabase
            .from('personal_note_shares')
            .upsert([{ note_id: noteId, shared_with: userId, can_edit: canEdit }]);

          if (error) return { error: error.message };
          
          // Actualizar is_shared en la nota
          await supabase
            .from('personal_notes')
            .update({ is_shared: true })
            .eq('id', noteId);

          // Obtener info del usuario actual y de la nota para la notificación
          const currentUser = (await supabase.auth.getUser()).data.user;
          const { data: noteData } = await supabase
            .from('personal_notes')
            .select('title')
            .eq('id', noteId)
            .single();

          console.log('[ShareNote] Creating notification for user:', userId);
          console.log('[ShareNote] Current user:', currentUser?.id);
          console.log('[ShareNote] Note data:', noteData);

          // Crear notificación para el usuario con quien se comparte
          if (currentUser && noteData) {
            const notifResult = await createNotification({
              userId: userId,
              type: 'share',
              title: 'Nota compartida contigo',
              message: `Te han compartido el notepad "${noteData.title}"${canEdit ? ' con permisos de edición' : ''}`,
              personalNoteId: noteId, // Usar personalNoteId, NO noteId (que es para tabla notes)
              fromUserId: currentUser.id,
            });
            console.log('[ShareNote] Notification result:', notifResult);
          } else {
            console.warn('[ShareNote] Missing currentUser or noteData, notification not sent');
          }

          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId ? { ...n, is_shared: true } : n
            ),
          }));

          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      unshareNote: async (noteId, userId) => {
        if (!isSupabaseConfigured || !supabase) {
          return { error: null };
        }

        try {
          const { error } = await supabase
            .from('personal_note_shares')
            .delete()
            .eq('note_id', noteId)
            .eq('shared_with', userId);

          if (error) return { error: error.message };

          // Verificar si aún hay shares
          const { data: remainingShares } = await supabase
            .from('personal_note_shares')
            .select('id')
            .eq('note_id', noteId);

          if (!remainingShares?.length) {
            await supabase
              .from('personal_notes')
              .update({ is_shared: false })
              .eq('id', noteId);

            set((state) => ({
              notes: state.notes.map((n) =>
                n.id === noteId ? { ...n, is_shared: false } : n
              ),
            }));
          }

          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      getShares: async (noteId) => {
        if (!isSupabaseConfigured || !supabase) {
          return [];
        }

        try {
          const { data } = await supabase
            .from('personal_note_shares')
            .select('*, user:profiles!shared_with(id, full_name, email, avatar_url)')
            .eq('note_id', noteId);

          return data || [];
        } catch {
          return [];
        }
      },
    }),
    {
      name: 'personal-notes-storage',
      partialize: (state) => ({ notes: state.notes, sharedWithMe: state.sharedWithMe }),
    }
  )
);
