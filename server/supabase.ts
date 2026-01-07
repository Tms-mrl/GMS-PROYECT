import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseEnabled = Boolean(supabaseUrl && serviceKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false },
    })
  : null;