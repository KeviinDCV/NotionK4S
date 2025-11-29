-- ============================================
-- SPRINTS Y TIME TRACKING PARA SCRUM
-- ============================================

-- Tabla de Sprints
CREATE TABLE IF NOT EXISTS sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  goal TEXT, -- Objetivo del sprint
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar sprint_id a notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL;

-- Agregar campos de fecha a notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);

-- Tabla de Time Entries (registro de tiempo)
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER, -- Calculado al finalizar
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Notas Personales (Notepad colaborativo)
CREATE TABLE IF NOT EXISTS personal_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de permisos de notas compartidas
CREATE TABLE IF NOT EXISTS personal_note_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES personal_notes(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, shared_with)
);

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Sprints: todos pueden ver, solo admins pueden crear/editar
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sprints are viewable by authenticated users"
  ON sprints FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sprints can be created by authenticated users"
  ON sprints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Sprints can be updated by creator"
  ON sprints FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Time Entries: usuarios ven sus propias entradas
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON time_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Personal Notes: propietario tiene acceso total
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes and shared notes"
  ON personal_notes FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (SELECT note_id FROM personal_note_shares WHERE shared_with = auth.uid())
  );

CREATE POLICY "Users can create own notes"
  ON personal_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own notes or shared with edit permission"
  ON personal_notes FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (SELECT note_id FROM personal_note_shares WHERE shared_with = auth.uid() AND can_edit = true)
  );

CREATE POLICY "Users can delete own notes"
  ON personal_notes FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Personal Note Shares
ALTER TABLE personal_note_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Note owners can manage shares"
  ON personal_note_shares FOR ALL
  TO authenticated
  USING (
    note_id IN (SELECT id FROM personal_notes WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can view shares for their notes"
  ON personal_note_shares FOR SELECT
  TO authenticated
  USING (shared_with = auth.uid());

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notes_sprint ON notes(sprint_id);
CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_note ON time_entries(note_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_notes_owner ON personal_notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_personal_note_shares_note ON personal_note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_personal_note_shares_user ON personal_note_shares(shared_with);

-- ============================================
-- FUNCIÓN PARA CALCULAR DURACIÓN
-- ============================================

CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();
