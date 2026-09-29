import { createClient } from '@supabase/supabase-js'

export const OWNER_EMAIL = 'mametatoma4685@outlook.es'
export const OWNER_NAME = 'AXUS-LOBOKING'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('LOBOKING+ no tiene configuradas las variables públicas de Supabase.')
}

export const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
