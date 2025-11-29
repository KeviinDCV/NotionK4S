-- ============================================
-- FIX: POLÍTICAS RLS SIN RECURSIÓN
-- Ejecutar este script para corregir los errores
-- ============================================

-- ============================================
-- 1. ELIMINAR POLÍTICAS ANTERIORES (personal_notes)
-- ============================================

DROP POLICY IF EXISTS "Users can view own notes and shared notes" ON personal_notes;
DROP POLICY IF EXISTS "Users can create own notes" ON personal_notes;
DROP POLICY IF EXISTS "Users can update own notes or shared with edit permission" ON personal_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON personal_notes;
DROP POLICY IF EXISTS "Note owners can manage shares" ON personal_note_shares;
DROP POLICY IF EXISTS "Users can view shares for their notes" ON personal_note_shares;

-- ============================================
-- 2. ELIMINAR POLÍTICAS ANTERIORES (meetings)
-- ============================================

DROP POLICY IF EXISTS "Users can view meetings they created or are invited to" ON meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON meetings;
DROP POLICY IF EXISTS "Creators can update their meetings" ON meetings;
DROP POLICY IF EXISTS "Creators can delete their meetings" ON meetings;
DROP POLICY IF EXISTS "Users can view participants of their meetings" ON meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can manage participants" ON meeting_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON meeting_participants;

-- ============================================
-- 3. FUNCIÓN AUXILIAR PARA EVITAR RECURSIÓN
-- ============================================

-- Función para verificar si un usuario tiene acceso a una nota personal
CREATE OR REPLACE FUNCTION user_has_access_to_personal_note(note_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM personal_notes WHERE id = note_uuid AND owner_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM personal_note_shares WHERE note_id = note_uuid AND shared_with = user_uuid
  );
$$;

-- Función para verificar si un usuario es dueño de una nota
CREATE OR REPLACE FUNCTION user_owns_personal_note(note_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM personal_notes WHERE id = note_uuid AND owner_id = user_uuid
  );
$$;

-- Función para verificar acceso a reunión
CREATE OR REPLACE FUNCTION user_has_access_to_meeting(meeting_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meetings WHERE id = meeting_uuid AND created_by = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM meeting_participants WHERE meeting_id = meeting_uuid AND user_id = user_uuid
  );
$$;

-- Función para verificar si es creador de reunión
CREATE OR REPLACE FUNCTION user_created_meeting(meeting_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meetings WHERE id = meeting_uuid AND created_by = user_uuid
  );
$$;

-- ============================================
-- 4. NUEVAS POLÍTICAS PARA personal_notes
-- ============================================

-- SELECT: Ver notas propias
CREATE POLICY "pn_select_own"
  ON personal_notes FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- SELECT: Ver notas compartidas conmigo
CREATE POLICY "pn_select_shared"
  ON personal_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal_note_shares 
      WHERE personal_note_shares.note_id = personal_notes.id 
      AND personal_note_shares.shared_with = auth.uid()
    )
  );

-- INSERT: Crear notas propias
CREATE POLICY "pn_insert"
  ON personal_notes FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Actualizar notas propias
CREATE POLICY "pn_update_own"
  ON personal_notes FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- UPDATE: Actualizar notas compartidas con permiso de edición
CREATE POLICY "pn_update_shared"
  ON personal_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM personal_note_shares 
      WHERE personal_note_shares.note_id = personal_notes.id 
      AND personal_note_shares.shared_with = auth.uid() 
      AND personal_note_shares.can_edit = true
    )
  );

-- DELETE: Eliminar notas propias
CREATE POLICY "pn_delete"
  ON personal_notes FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================
-- 5. NUEVAS POLÍTICAS PARA personal_note_shares
-- ============================================

-- SELECT: Ver shares de notas propias
CREATE POLICY "pns_select_owner"
  ON personal_note_shares FOR SELECT
  TO authenticated
  USING (user_owns_personal_note(note_id, auth.uid()));

-- SELECT: Ver shares donde soy el receptor
CREATE POLICY "pns_select_shared"
  ON personal_note_shares FOR SELECT
  TO authenticated
  USING (shared_with = auth.uid());

-- INSERT: Crear shares para notas propias
CREATE POLICY "pns_insert"
  ON personal_note_shares FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_personal_note(note_id, auth.uid()));

-- UPDATE: Actualizar shares de notas propias
CREATE POLICY "pns_update"
  ON personal_note_shares FOR UPDATE
  TO authenticated
  USING (user_owns_personal_note(note_id, auth.uid()));

-- DELETE: Eliminar shares de notas propias
CREATE POLICY "pns_delete"
  ON personal_note_shares FOR DELETE
  TO authenticated
  USING (user_owns_personal_note(note_id, auth.uid()));

-- ============================================
-- 6. NUEVAS POLÍTICAS PARA meetings
-- ============================================

-- SELECT: Ver reuniones propias
CREATE POLICY "mtg_select_own"
  ON meetings FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- SELECT: Ver reuniones donde soy participante
CREATE POLICY "mtg_select_participant"
  ON meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meeting_participants 
      WHERE meeting_participants.meeting_id = meetings.id 
      AND meeting_participants.user_id = auth.uid()
    )
  );

-- INSERT: Crear reuniones
CREATE POLICY "mtg_insert"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: Actualizar reuniones propias
CREATE POLICY "mtg_update"
  ON meetings FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- DELETE: Eliminar reuniones propias
CREATE POLICY "mtg_delete"
  ON meetings FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- 7. NUEVAS POLÍTICAS PARA meeting_participants
-- ============================================

-- SELECT: Ver participantes de reuniones propias
CREATE POLICY "mp_select_creator"
  ON meeting_participants FOR SELECT
  TO authenticated
  USING (user_created_meeting(meeting_id, auth.uid()));

-- SELECT: Ver mi propia participación
CREATE POLICY "mp_select_self"
  ON meeting_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Creador puede agregar participantes
CREATE POLICY "mp_insert"
  ON meeting_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_created_meeting(meeting_id, auth.uid()));

-- UPDATE: Creador puede actualizar participantes
CREATE POLICY "mp_update_creator"
  ON meeting_participants FOR UPDATE
  TO authenticated
  USING (user_created_meeting(meeting_id, auth.uid()));

-- UPDATE: Participante puede actualizar su estado
CREATE POLICY "mp_update_self"
  ON meeting_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Creador puede eliminar participantes
CREATE POLICY "mp_delete"
  ON meeting_participants FOR DELETE
  TO authenticated
  USING (user_created_meeting(meeting_id, auth.uid()));

-- ============================================
-- DONE!
-- ============================================
