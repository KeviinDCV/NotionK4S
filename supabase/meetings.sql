-- ============================================
-- TABLA DE REUNIONES
-- ============================================

CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  room_name VARCHAR(255) NOT NULL UNIQUE, -- Nombre único de la sala Jitsi
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de participantes de reunión
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'joined')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- ============================================
-- POLÍTICAS RLS
-- ============================================

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meetings they created or are invited to"
  ON meetings FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    id IN (SELECT meeting_id FROM meeting_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create meetings"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their meetings"
  ON meetings FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their meetings"
  ON meetings FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Participantes
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants of their meetings"
  ON meeting_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    meeting_id IN (SELECT id FROM meetings WHERE created_by = auth.uid())
  );

CREATE POLICY "Meeting creators can manage participants"
  ON meeting_participants FOR ALL
  TO authenticated
  USING (
    meeting_id IN (SELECT id FROM meetings WHERE created_by = auth.uid())
  );

CREATE POLICY "Users can update their own participation"
  ON meeting_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);
