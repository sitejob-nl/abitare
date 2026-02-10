-- Fix overly permissive order_checklist_items RLS policies
-- Replace USING(true) with division-scoped access

DROP POLICY IF EXISTS "Authenticated users can view checklist items" ON public.order_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can insert checklist items" ON public.order_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can update checklist items" ON public.order_checklist_items;
DROP POLICY IF EXISTS "Authenticated users can delete checklist items" ON public.order_checklist_items;

-- SELECT: scoped to user's division, salesperson, assistant, or admin
CREATE POLICY "checklist_select" ON public.order_checklist_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_checklist_items.order_id
    AND (
      is_admin(auth.uid())
      OR o.division_id = get_user_division_id(auth.uid())
      OR o.salesperson_id = auth.uid()
      OR o.assistant_id = auth.uid()
      OR o.installer_id = auth.uid()
    )
  )
);

-- INSERT: same scope
CREATE POLICY "checklist_insert" ON public.order_checklist_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_checklist_items.order_id
    AND (
      is_admin(auth.uid())
      OR o.division_id = get_user_division_id(auth.uid())
      OR o.salesperson_id = auth.uid()
      OR o.assistant_id = auth.uid()
    )
  )
);

-- UPDATE: same scope (no installer - they shouldn't toggle checklist)
CREATE POLICY "checklist_update" ON public.order_checklist_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_checklist_items.order_id
    AND (
      is_admin(auth.uid())
      OR o.division_id = get_user_division_id(auth.uid())
      OR o.salesperson_id = auth.uid()
      OR o.assistant_id = auth.uid()
    )
  )
);

-- DELETE: admin or manager only
CREATE POLICY "checklist_delete" ON public.order_checklist_items
FOR DELETE TO authenticated
USING (is_admin_or_manager(auth.uid()));