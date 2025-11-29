import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciales de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verificar si hay credenciales válidas
export const isSupabaseConfigured = supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  !supabaseUrl.includes('your-project');

// Crear cliente solo si hay credenciales
export const supabase: SupabaseClient | null = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Tipos de la base de datos
export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'developer';
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'task' | 'change' | 'bug' | 'feature' | 'note';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project?: string | null;
  assigned_to?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  parent_id?: string | null;
  sprint_id?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  estimated_hours?: number | null;
  assigned_user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Activity {
  id: string;
  user_id: string;
  note_id?: string;
  action: string;
  description: string;
  created_at: string;
}

export interface Comment {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Datos del usuario (join)
  user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'assignment' | 'status_change' | 'mention' | 'share' | 'meeting_invite';
  title: string;
  message: string;
  note_id?: string;
  personal_note_id?: string;
  meeting_id?: string;
  from_user_id?: string;
  read: boolean;
  created_at: string;
  from_user?: {
    full_name: string;
    avatar_url?: string;
  };
}

// Servicio para crear notificaciones
export async function createNotification(data: {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  noteId?: string;
  personalNoteId?: string;
  meetingId?: string;
  fromUserId?: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    console.log('[Notification] Supabase not configured, skipping');
    return { error: null };
  }

  try {
    console.log('[Notification] Creating notification:', data);
    
    const notificationData = {
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      note_id: data.noteId || null,
      personal_note_id: data.personalNoteId || null,
      meeting_id: data.meetingId || null,
      from_user_id: data.fromUserId || null,
      read: false,
    };
    
    const { error } = await supabase.from('notifications').insert([notificationData]);

    if (error) {
      console.error('[Notification] Error creating notification:', error);
      return { error: error.message };
    }
    
    console.log('[Notification] Notification created successfully');
    return { error: null };
  } catch (err: any) {
    console.error('[Notification] Exception:', err);
    return { error: err.message };
  }
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  note_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  created_at: string;
  note?: Note;
}

export interface PersonalNote {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  owner?: User;
  shares?: PersonalNoteShare[];
}

export interface PersonalNoteShare {
  id: string;
  note_id: string;
  shared_with: string;
  can_edit: boolean;
  created_at: string;
  user?: User;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  room_name: string;
  scheduled_at: string;
  duration_minutes: number;
  created_by: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  creator?: User;
  participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  status: 'invited' | 'accepted' | 'declined' | 'joined';
  joined_at?: string;
  left_at?: string;
  created_at: string;
  user?: User;
}

// Chat System
export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'code' | 'image' | 'file';
  code_language?: string;
  reply_to?: string;
  edited_at?: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

// Expenses
export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category_id?: string;
  vendor?: string;
  invoice_number?: string;
  expense_date: string;
  payment_method?: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  receipt_url?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
  creator?: {
    full_name: string;
    email: string;
  };
}
