import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables to get Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the environment variables are set
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

// Initialize and export the Supabase clients
export const supabaseServiceRoleClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
