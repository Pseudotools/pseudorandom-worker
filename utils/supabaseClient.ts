import { createClient, SupabaseClient } from '@supabase/supabase-js';


// Use environment variables to get Supabase URL and anon key
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize and export the Supabase client
export const supabaseServiceRoleClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
