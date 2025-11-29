-- ============================================
-- SISTEMA DE CHAT EN TIEMPO REAL
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- =============================================
-- TABLA DE CANALES
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON public.chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_at ON public.chat_channels(created_at);

-- =============================================
-- TABLA DE MIEMBROS DE CANAL (para canales privados)
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(channel_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON public.chat_channel_members(user_id);

-- =============================================
-- TABLA DE MENSAJES
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'code', 'image', 'file')),
  code_language TEXT, -- Para bloques de código
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Habilitar RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para canales
CREATE POLICY "Users can view public channels"
  ON public.chat_channels FOR SELECT
  TO authenticated
  USING (type = 'public');

CREATE POLICY "Users can view channels they are members of"
  ON public.chat_channels FOR SELECT
  TO authenticated
  USING (
    type = 'private' AND 
    id IN (SELECT channel_id FROM public.chat_channel_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create channels"
  ON public.chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Channel creators can update their channels"
  ON public.chat_channels FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Channel creators can delete their channels"
  ON public.chat_channels FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Políticas para miembros de canal
CREATE POLICY "Users can view channel memberships"
  ON public.chat_channel_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join channels"
  ON public.chat_channel_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can leave channels"
  ON public.chat_channel_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas para mensajes
CREATE POLICY "Users can view messages in their channels"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM public.chat_channels WHERE type = 'public'
      UNION
      SELECT channel_id FROM public.chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can edit their own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- HABILITAR REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;

-- =============================================
-- INSERTAR CANALES POR DEFECTO
-- =============================================
INSERT INTO public.chat_channels (name, description, type) VALUES
  ('general', 'Canal general para todo el equipo', 'public'),
  ('desarrollo', 'Discusiones técnicas y de código', 'public'),
  ('random', 'Conversaciones casuales y off-topic', 'public')
ON CONFLICT DO NOTHING;

-- ============================================
-- DONE!
-- ============================================
