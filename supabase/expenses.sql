-- ============================================
-- SISTEMA DE GASTOS EMPRESARIALES
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- =============================================
-- TABLA DE CATEGORÍAS DE GASTOS
-- =============================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT, -- emoji o nombre de icono
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar constraint único en name
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_categories_name_key'
  ) THEN
    ALTER TABLE public.expense_categories ADD CONSTRAINT expense_categories_name_key UNIQUE (name);
  END IF;
END $$;

-- Insertar categorías por defecto (solo si no existen)
INSERT INTO public.expense_categories (name, icon, color)
SELECT * FROM (VALUES
  ('Software y Licencias', '💻', '#3b82f6'),
  ('Hardware y Equipos', '🖥️', '#8b5cf6'),
  ('Servicios Cloud', '☁️', '#06b6d4'),
  ('Salarios y Nómina', '👥', '#10b981'),
  ('Oficina y Suministros', '📎', '#f59e0b'),
  ('Marketing', '📢', '#ec4899'),
  ('Servicios Profesionales', '💼', '#6366f1'),
  ('Viajes y Transporte', '✈️', '#14b8a6'),
  ('Capacitación', '📚', '#f97316'),
  ('Otros', '📦', '#64748b')
) AS v(name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories WHERE expense_categories.name = v.name
);

-- =============================================
-- TABLA DE GASTOS
-- =============================================

-- Si la tabla existe con estructura incorrecta, eliminarla primero
DROP TABLE IF EXISTS public.expenses CASCADE;

CREATE TABLE public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Sin decimales para COP
  currency TEXT DEFAULT 'COP',
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  vendor TEXT, -- Proveedor
  invoice_number TEXT, -- Número de factura
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'check', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes TEXT,
  receipt_url TEXT, -- URL del comprobante
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Categories are viewable by authenticated users" ON public.expense_categories;
DROP POLICY IF EXISTS "Expenses are viewable by authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses or approved ones" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own pending expenses" ON public.expenses;

-- Categorías: todos pueden ver
CREATE POLICY "Categories are viewable by authenticated users"
  ON public.expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- Gastos: usuarios autenticados pueden ver todos los gastos
CREATE POLICY "Expenses are viewable by authenticated users"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own expenses or approved ones"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = approved_by);

CREATE POLICY "Users can delete own pending expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND status = 'pending');

-- ============================================
-- TRIGGER PARA UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS trigger_expense_updated_at ON public.expenses;

CREATE OR REPLACE FUNCTION update_expense_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expense_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_updated_at();

-- ============================================
-- DONE!
-- ============================================
