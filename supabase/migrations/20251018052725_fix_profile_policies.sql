/*
  # Fix Profile Policies

  ## Changes
  1. Drop problematic policies that cause infinite recursion
  2. Create simplified policies that work correctly
  3. Allow profile creation during registration
  4. Fix Admin access without recursion

  ## Security
  - Users can create their own profile during signup
  - Users can view and update their own profile
  - All authenticated users can view other profiles (needed for doctor/patient references)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new working policies

-- Allow users to insert their profile during registration (bypass RLS for service role)
CREATE POLICY "Enable insert for authenticated users during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow all authenticated users to view other profiles (for references in visits, appointments, etc.)
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
