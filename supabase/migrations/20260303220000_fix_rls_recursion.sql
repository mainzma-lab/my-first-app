-- Fix: infinite recursion in "Admins can manage users" policy
-- The FOR ALL policy had a self-referential sub-query that caused
-- ERROR 42P17 when any authenticated user queried the users table.

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- 2. Security-definer function: reads users table as superuser → no RLS loop
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  )
$$;

-- 3. Re-create admin write policies using the safe function
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE TO authenticated
  USING (public.is_admin());
