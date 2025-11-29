import { create } from 'zustand';
import { supabase, isSupabaseConfigured, Expense, ExpenseCategory } from '../lib/supabase';

interface ExpensesState {
  expenses: Expense[];
  categories: ExpenseCategory[];
  isLoading: boolean;
  
  fetchExpenses: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createExpense: (expense: Partial<Expense>) => Promise<{ error: string | null }>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<{ error: string | null }>;
  deleteExpense: (id: string) => Promise<{ error: string | null }>;
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  expenses: [],
  categories: [],
  isLoading: false,

  fetchCategories: async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode
      set({
        categories: [
          { id: 'cat-1', name: 'Software y Licencias', icon: '💻', color: '#3b82f6', created_at: new Date().toISOString() },
          { id: 'cat-2', name: 'Hardware y Equipos', icon: '🖥️', color: '#8b5cf6', created_at: new Date().toISOString() },
          { id: 'cat-3', name: 'Servicios Cloud', icon: '☁️', color: '#06b6d4', created_at: new Date().toISOString() },
          { id: 'cat-4', name: 'Salarios y Nómina', icon: '👥', color: '#10b981', created_at: new Date().toISOString() },
          { id: 'cat-5', name: 'Oficina y Suministros', icon: '📎', color: '#f59e0b', created_at: new Date().toISOString() },
          { id: 'cat-6', name: 'Marketing', icon: '📢', color: '#ec4899', created_at: new Date().toISOString() },
          { id: 'cat-7', name: 'Otros', icon: '📦', color: '#64748b', created_at: new Date().toISOString() },
        ],
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ categories: data || [] });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  fetchExpenses: async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode
      const categories = get().categories;
      set({
        expenses: [
          {
            id: 'exp-1',
            description: 'Licencia Figma Anual',
            amount: 580000,
            currency: 'COP',
            category_id: 'cat-1',
            vendor: 'Figma Inc.',
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'card',
            status: 'paid',
            created_by: 'demo-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: categories.find(c => c.id === 'cat-1'),
          },
          {
            id: 'exp-2',
            description: 'AWS - Noviembre 2024',
            amount: 350000,
            currency: 'COP',
            category_id: 'cat-3',
            vendor: 'Amazon Web Services',
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'card',
            status: 'pending',
            created_by: 'demo-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: categories.find(c => c.id === 'cat-3'),
          },
        ],
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          category:expense_categories(*),
          creator:profiles!expenses_created_by_fkey(full_name, email)
        `)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      set({ expenses: data || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      set({ isLoading: false });
    }
  },

  createExpense: async (expense) => {
    if (!isSupabaseConfigured || !supabase) {
      const categories = get().categories;
      const newExpense: Expense = {
        id: `exp-${Date.now()}`,
        description: expense.description || '',
        amount: expense.amount || 0,
        currency: expense.currency || 'COP',
        category_id: expense.category_id,
        vendor: expense.vendor,
        invoice_number: expense.invoice_number,
        expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
        payment_method: expense.payment_method,
        status: 'pending',
        notes: expense.notes,
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: categories.find(c => c.id === expense.category_id),
      };
      set((state) => ({ expenses: [newExpense, ...state.expenses] }));
      return { error: null };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ ...expense, created_by: user?.id }])
        .select(`
          *,
          category:expense_categories(*),
          creator:profiles!expenses_created_by_fkey(full_name, email)
        `)
        .single();

      if (error) return { error: error.message };
      
      set((state) => ({ expenses: [data, ...state.expenses] }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  updateExpense: async (id, updates) => {
    if (!isSupabaseConfigured || !supabase) {
      const categories = get().categories;
      set((state) => ({
        expenses: state.expenses.map(e => 
          e.id === id 
            ? { ...e, ...updates, category: categories.find(c => c.id === updates.category_id) || e.category }
            : e
        ),
      }));
      return { error: null };
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          category:expense_categories(*),
          creator:profiles!expenses_created_by_fkey(full_name, email)
        `)
        .single();

      if (error) return { error: error.message };
      
      set((state) => ({
        expenses: state.expenses.map(e => e.id === id ? data : e),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },

  deleteExpense: async (id) => {
    if (!isSupabaseConfigured || !supabase) {
      set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id),
      }));
      return { error: null };
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) return { error: error.message };
      
      set((state) => ({
        expenses: state.expenses.filter(e => e.id !== id),
      }));
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  },
}));
