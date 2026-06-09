import { createClient } from '@supabase/supabase-js'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

let _instance: ReturnType<typeof makeClient> | null = null

// Lazy singleton: client is only created on first property access (runtime),
// not at module evaluation time (build). Prevents "supabaseUrl is required" on Vercel.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof makeClient>, {
  get(_, prop: string | symbol) {
    if (!_instance) _instance = makeClient()
    return Reflect.get(_instance, prop)
  },
})
