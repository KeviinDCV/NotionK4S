import { create } from 'zustand';
import { supabase, isSupabaseConfigured, Sprint } from '../lib/supabase';

interface SprintState {
  sprints: Sprint[];
  currentSprint: Sprint | null;
  isLoading: boolean;
  
  fetchSprints: () => Promise<void>;
  createSprint: (sprint: Partial<Sprint>) => Promise<{ error: string | null }>;
  updateSprint: (id: string, updates: Partial<Sprint>) => Promise<{ error: string | null }>;
  deleteSprint: (id: string) => Promise<{ error: string | null }>;
  setCurrentSprint: (sprint: Sprint | null) => void;
}

export const useSprintStore = create<SprintState>((set) => ({
  sprints: [],
  currentSprint: null,
  isLoading: false,

  fetchSprints: async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode
      const demoSprints: Sprint[] = [
        {
          id: 'demo-sprint-1',
          name: 'Sprint 1 - MVP',
          goal: 'Lanzar la versión inicial del producto',
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          created_by: 'demo-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
      set({ 
        sprints: demoSprints, 
        currentSprint: demoSprints[0],
        isLoading: false 
      });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Encontrar sprint activo
      const activeSprint = (data || []).find(s => s.status === 'active') || null;
      
      set({ 
        sprints: data || [], 
        currentSprint: activeSprint,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching sprints:', error);
      set({ isLoading: false });
    }
  },

  createSprint: async (sprint) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { data, error } = await supabase
        .from('sprints')
        .insert([sprint])
        .select()
        .single();

      if (error) return { error: error.message };
      
      set((state) => ({ 
        sprints: [data, ...state.sprints],
        currentSprint: data.status === 'active' ? data : state.currentSprint,
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateSprint: async (id, updates) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { data, error } = await supabase
        .from('sprints')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return { error: error.message };
      
      set((state) => ({
        sprints: state.sprints.map(s => s.id === id ? data : s),
        currentSprint: state.currentSprint?.id === id ? data : 
                      (data.status === 'active' ? data : state.currentSprint),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  deleteSprint: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase.from('sprints').delete().eq('id', id);
      if (error) return { error: error.message };
      
      set((state) => ({
        sprints: state.sprints.filter(s => s.id !== id),
        currentSprint: state.currentSprint?.id === id ? null : state.currentSprint,
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  setCurrentSprint: (sprint) => set({ currentSprint: sprint }),
}));
