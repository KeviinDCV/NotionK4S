import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured, Note, createNotification } from '../lib/supabase';

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  selectedNote: Note | null;
  filter: {
    type: string | null;
    status: string | null;
    priority: string | null;
    search: string;
  };

  // Actions
  fetchNotes: () => Promise<void>;
  createNote: (note: Partial<Note>) => Promise<{ error: string | null }>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<{ error: string | null }>;
  deleteNote: (id: string) => Promise<{ error: string | null }>;
  setSelectedNote: (note: Note | null) => void;
  setFilter: (filter: Partial<NotesState['filter']>) => void;
}

// Generar ID único para modo demo
const generateId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      isLoading: false,
      selectedNote: null,
      filter: {
        type: null,
        status: null,
        priority: null,
        search: '',
      },

      fetchNotes: async () => {
        // En modo demo, las notas ya están en el estado local
        if (!isSupabaseConfigured || !supabase) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          let query = supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

          const { filter } = get();
          
          if (filter.type) query = query.eq('type', filter.type);
          if (filter.status) query = query.eq('status', filter.status);
          if (filter.priority) query = query.eq('priority', filter.priority);
          if (filter.search) query = query.ilike('title', `%${filter.search}%`);

          const { data, error } = await query;
          if (error) throw error;
          set({ notes: data || [], isLoading: false });
        } catch (error) {
          console.error('Error fetching notes:', error);
          set({ isLoading: false });
        }
      },

      createNote: async (note) => {
        // Modo demo - guardar localmente
        if (!isSupabaseConfigured || !supabase) {
          const newNote: Note = {
            id: generateId(),
            title: note.title || '',
            content: note.content || '',
            type: note.type || 'note',
            status: note.status || 'pending',
            priority: note.priority || 'medium',
            project: note.project,
            created_by: note.created_by || 'demo-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: note.tags || [],
          };
          set((state) => ({ notes: [newNote, ...state.notes] }));
          return { error: null };
        }

        try {
          // Limpiar campos vacíos - convertir "" a null para campos UUID
          const cleanedNote = {
            ...note,
            assigned_to: note.assigned_to || null,
            parent_id: note.parent_id || null,
            project: note.project || null,
          };

          const { data, error } = await supabase
            .from('notes')
            .insert([cleanedNote])
            .select()
            .single();

          if (error) return { error: error.message };

          // Notificar al usuario asignado (si es diferente al creador)
          if (cleanedNote.assigned_to && cleanedNote.assigned_to !== cleanedNote.created_by) {
            const currentUser = (await supabase.auth.getUser()).data.user;
            await createNotification({
              userId: cleanedNote.assigned_to,
              type: 'assignment',
              title: 'Nueva tarea asignada',
              message: `Te han asignado la tarea "${data.title}"`,
              noteId: data.id,
              fromUserId: currentUser?.id,
            });
          }

          set((state) => ({ notes: [data, ...state.notes] }));
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      updateNote: async (id, updates) => {
        // Modo demo
        if (!isSupabaseConfigured || !supabase) {
          set((state) => ({
            notes: state.notes.map((n) => 
              n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
            ),
            selectedNote: state.selectedNote?.id === id 
              ? { ...state.selectedNote, ...updates } 
              : state.selectedNote,
          }));
          return { error: null };
        }

        try {
          // Limpiar campos vacíos - convertir "" a null para campos UUID
          const cleanedUpdates = {
            ...updates,
            updated_at: new Date().toISOString(),
          };
          
          // Solo limpiar si el campo está presente en updates
          if ('assigned_to' in updates) {
            cleanedUpdates.assigned_to = updates.assigned_to || null;
          }
          if ('parent_id' in updates) {
            cleanedUpdates.parent_id = updates.parent_id || null;
          }
          if ('project' in updates) {
            cleanedUpdates.project = updates.project || null;
          }

          // Obtener la nota actual para verificar cambios en asignación
          const { data: currentNote } = await supabase
            .from('notes')
            .select('assigned_to, title')
            .eq('id', id)
            .single();

          const { data, error } = await supabase
            .from('notes')
            .update(cleanedUpdates)
            .eq('id', id)
            .select()
            .single();

          if (error) return { error: error.message };

          // Notificar si se cambió la asignación a un nuevo usuario
          if (cleanedUpdates.assigned_to && 
              cleanedUpdates.assigned_to !== currentNote?.assigned_to) {
            const currentUser = (await supabase.auth.getUser()).data.user;
            await createNotification({
              userId: cleanedUpdates.assigned_to,
              type: 'assignment',
              title: 'Tarea asignada',
              message: `Te han asignado la tarea "${data.title}"`,
              noteId: id,
              fromUserId: currentUser?.id,
            });
          }

          set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? data : n)),
            selectedNote: state.selectedNote?.id === id ? data : state.selectedNote,
          }));
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      deleteNote: async (id) => {
        // Modo demo
        if (!isSupabaseConfigured || !supabase) {
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
            selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
          }));
          return { error: null };
        }

        try {
          const { error } = await supabase.from('notes').delete().eq('id', id);
          if (error) return { error: error.message };
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
            selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
          }));
          return { error: null };
        } catch (err: any) {
          return { error: err.message };
        }
      },

      setSelectedNote: (note) => set({ selectedNote: note }),

      setFilter: (filter) => {
        set((state) => ({ filter: { ...state.filter, ...filter } }));
        get().fetchNotes();
      },
    }),
    {
      name: 'notes-storage',
      partialize: (state) => ({ notes: state.notes }),
    }
  )
);
