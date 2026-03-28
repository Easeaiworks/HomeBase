-- ============================================================
-- HomeBase — Initial Database Schema
-- Multi-tenant household management with RLS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HOUSEHOLDS & MEMBERS
-- ============================================================

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  created_at timestamptz NOT NULL DEFAULT now(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT households_invite_code_unique UNIQUE (invite_code)
);

CREATE TABLE household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('parent', 'teen', 'child')),
  display_name text NOT NULL,
  avatar_url text,
  permissions jsonb NOT NULL DEFAULT '{"can_spend": true, "can_message": false, "can_view_finances": false}'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT household_members_unique UNIQUE (household_id, user_id)
);

CREATE INDEX idx_household_members_user ON household_members(user_id);
CREATE INDEX idx_household_members_household ON household_members(household_id);

-- ============================================================
-- EVENTS / CALENDAR
-- ============================================================

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES household_members(id),
  assigned_to uuid[] DEFAULT '{}',
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  recurrence_rule text,
  reminders jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_household ON events(household_id);
CREATE INDEX idx_events_starts_at ON events(household_id, starts_at);

-- ============================================================
-- EXPENSES & BUDGETS
-- ============================================================

CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  icon text,
  color text,
  CONSTRAINT expense_categories_unique_name UNIQUE (household_id, name, parent_id)
);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  recorded_by uuid NOT NULL REFERENCES household_members(id),
  vendor text,
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'CAD',
  date date NOT NULL,
  receipt_url text,
  ocr_data jsonb,
  notes text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'receipt_scan', 'bank_import', 'voice')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_household ON expenses(household_id);
CREATE INDEX idx_expenses_date ON expenses(household_id, date);
CREATE INDEX idx_expenses_category ON expenses(household_id, category_id);

CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id uuid REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  period text NOT NULL CHECK (period IN ('weekly', 'monthly', 'annual')),
  alert_threshold decimal(3,2) NOT NULL DEFAULT 0.80,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GROCERY LISTS
-- ============================================================

CREATE TABLE grocery_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main List',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text,
  category text,
  is_checked boolean NOT NULL DEFAULT false,
  added_by uuid NOT NULL REFERENCES household_members(id),
  deals jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grocery_items_list ON grocery_items(list_id);

-- ============================================================
-- RECIPES
-- ============================================================

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  prep_time_min int,
  cook_time_min int,
  servings int,
  tags text[] DEFAULT '{}',
  source_url text,
  image_url text,
  times_cooked int NOT NULL DEFAULT 0,
  rating decimal(2,1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_household ON recipes(household_id);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- ============================================================
-- MAINTENANCE (HOME, VEHICLE, PET)
-- ============================================================

CREATE TABLE maintenance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('home', 'vehicle', 'pet', 'appliance')),
  title text NOT NULL,
  description text,
  asset_name text,
  frequency_days int,
  season text,
  last_completed_at timestamptz,
  next_due_at timestamptz,
  reminders_enabled boolean NOT NULL DEFAULT true,
  tips jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_household ON maintenance_items(household_id);
CREATE INDEX idx_maintenance_due ON maintenance_items(household_id, next_due_at);

-- ============================================================
-- CONTACTS & COMMUNICATION
-- ============================================================

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  relationship text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  sent_by uuid NOT NULL REFERENCES household_members(id),
  type text NOT NULL CHECK (type IN ('sms', 'email', 'call')),
  content text,
  context text,
  status text NOT NULL DEFAULT 'drafted' CHECK (status IN ('drafted', 'approved', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- HABIT LEARNING / USER PATTERNS
-- ============================================================

CREATE TABLE user_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member_id uuid REFERENCES household_members(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  pattern_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence decimal(3,2) NOT NULL DEFAULT 0.00,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES household_members(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_household ON audit_log(household_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: get household IDs for current user
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$;

-- HOUSEHOLDS: members can view their own household
CREATE POLICY "Members can view their household"
  ON households FOR SELECT
  USING (id IN (SELECT get_my_household_ids()));

-- HOUSEHOLD MEMBERS: members can view their household's members
CREATE POLICY "Members can view household members"
  ON household_members FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Users can insert themselves as members"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- EVENTS: household-scoped
CREATE POLICY "Members can view household events"
  ON events FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can create events"
  ON events FOR INSERT
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can update household events"
  ON events FOR UPDATE
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can delete household events"
  ON events FOR DELETE
  USING (household_id IN (SELECT get_my_household_ids()));

-- EXPENSE CATEGORIES: household-scoped
CREATE POLICY "Members can view expense categories"
  ON expense_categories FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can manage expense categories"
  ON expense_categories FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- EXPENSES: household-scoped
CREATE POLICY "Members can view expenses"
  ON expenses FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can update expenses"
  ON expenses FOR UPDATE
  USING (household_id IN (SELECT get_my_household_ids()));

-- BUDGETS: household-scoped
CREATE POLICY "Members can view budgets"
  ON budgets FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can manage budgets"
  ON budgets FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- GROCERY LISTS: household-scoped
CREATE POLICY "Members can view grocery lists"
  ON grocery_lists FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can manage grocery lists"
  ON grocery_lists FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- GROCERY ITEMS: via list → household
CREATE POLICY "Members can view grocery items"
  ON grocery_items FOR SELECT
  USING (list_id IN (
    SELECT id FROM grocery_lists WHERE household_id IN (SELECT get_my_household_ids())
  ));

CREATE POLICY "Members can manage grocery items"
  ON grocery_items FOR ALL
  USING (list_id IN (
    SELECT id FROM grocery_lists WHERE household_id IN (SELECT get_my_household_ids())
  ));

-- RECIPES: household-scoped (null household_id = global)
CREATE POLICY "Members can view recipes"
  ON recipes FOR SELECT
  USING (household_id IS NULL OR household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can manage household recipes"
  ON recipes FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- MAINTENANCE: household-scoped
CREATE POLICY "Members can view maintenance"
  ON maintenance_items FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can manage maintenance"
  ON maintenance_items FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- CONTACTS: household-scoped
CREATE POLICY "Members can view contacts"
  ON contacts FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can manage contacts"
  ON contacts FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- COMMUNICATION LOG: household-scoped
CREATE POLICY "Members can view communication log"
  ON communication_log FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

CREATE POLICY "Members can create communication log"
  ON communication_log FOR INSERT
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- USER PATTERNS: household-scoped
CREATE POLICY "Members can view patterns"
  ON user_patterns FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

-- AUDIT LOG: household-scoped, read only
CREATE POLICY "Parents can view audit log"
  ON audit_log FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Create household + add creator as parent member (atomic)
CREATE OR REPLACE FUNCTION create_household_with_member(
  household_name text,
  member_display_name text,
  member_role text DEFAULT 'parent'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_household_id uuid;
  new_member_id uuid;
BEGIN
  -- Create household
  INSERT INTO households (name)
  VALUES (household_name)
  RETURNING id INTO new_household_id;

  -- Create member
  INSERT INTO household_members (household_id, user_id, role, display_name, permissions)
  VALUES (
    new_household_id,
    auth.uid(),
    member_role,
    member_display_name,
    '{"can_spend": true, "can_message": true, "can_view_finances": true}'::jsonb
  )
  RETURNING id INTO new_member_id;

  -- Create default expense categories
  INSERT INTO expense_categories (household_id, name, icon, color) VALUES
    (new_household_id, 'House', '🏠', '#3B82F6'),
    (new_household_id, 'Entertainment', '🎬', '#14B8A6'),
    (new_household_id, 'Kids', '👶', '#22C55E'),
    (new_household_id, 'Groceries', '🛒', '#16A34A'),
    (new_household_id, 'Vehicle', '🚗', '#6B7280'),
    (new_household_id, 'Health', '🏥', '#EF4444'),
    (new_household_id, 'Subscriptions', '📱', '#1D4ED8');

  -- Create subcategories for House
  INSERT INTO expense_categories (household_id, name, parent_id, icon)
  SELECT new_household_id, sub.name, c.id, sub.icon
  FROM (VALUES ('Hydro', '⚡'), ('Water', '💧'), ('Gas', '🔥'), ('Repairs', '🔧')) AS sub(name, icon)
  CROSS JOIN expense_categories c
  WHERE c.household_id = new_household_id AND c.name = 'House';

  -- Create subcategories for Entertainment
  INSERT INTO expense_categories (household_id, name, parent_id, icon)
  SELECT new_household_id, sub.name, c.id, sub.icon
  FROM (VALUES ('Restaurant', '🍽️'), ('Movies', '🎬'), ('Theater', '🎭'), ('Park', '🌳'), ('Arcade', '🕹️')) AS sub(name, icon)
  CROSS JOIN expense_categories c
  WHERE c.household_id = new_household_id AND c.name = 'Entertainment';

  -- Create subcategories for Kids
  INSERT INTO expense_categories (household_id, name, parent_id, icon)
  SELECT new_household_id, sub.name, c.id, sub.icon
  FROM (VALUES ('Sports', '⚽'), ('Allowance', '💵'), ('Gifts', '🎁')) AS sub(name, icon)
  CROSS JOIN expense_categories c
  WHERE c.household_id = new_household_id AND c.name = 'Kids';

  -- Create default grocery list
  INSERT INTO grocery_lists (household_id) VALUES (new_household_id);

  RETURN jsonb_build_object(
    'household_id', new_household_id,
    'member_id', new_member_id
  );
END;
$$;

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- Note: Storage bucket creation must be done via the Supabase dashboard
-- or storage API. Create these buckets:
--   1. "receipts" (private) - for receipt images
--   2. "avatars" (public) - for user profile photos
