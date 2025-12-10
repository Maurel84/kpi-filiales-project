import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let supabase: SupabaseClient | null = null

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Variables manquantes : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY. Verifiez votre fichier .env.'
  )
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true }
  })
}

export { supabase }
