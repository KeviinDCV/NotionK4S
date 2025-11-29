-- ============================================
-- ACTUALIZAR TABLA DE NOTIFICACIONES
-- Agregar columna meeting_id, nuevos tipos y arreglar políticas
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================

-- 1. Agregar columna meeting_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'meeting_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Eliminar el constraint de tipo anterior
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. Agregar nuevo constraint con TODOS los tipos
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('comment', 'assignment', 'status_change', 'mention', 'share', 'meeting_invite'));

-- 4. Crear índice para meeting_id
CREATE INDEX IF NOT EXISTS idx_notifications_meeting_id ON public.notifications(meeting_id);

-- 5. ARREGLAR POLÍTICA DE INSERT (el problema principal)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Nueva política que permite insertar notificaciones para cualquier usuario autenticado
CREATE POLICY "Authenticated users can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Asegurar que RLS está habilitado
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE! Ahora las notificaciones deberían funcionar
-- ============================================
