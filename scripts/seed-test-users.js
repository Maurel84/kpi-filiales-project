// scripts/seed-test-users.js
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const accounts = [
  { email: 'user.f001@test.com', password: 'Test1234!', role: 'USER', filiale_code: 'F001', display_name: 'User F001' },
  { email: 'manager.f001@test.com', password: 'Test1234!', role: 'MANAGER_FILIALE', filiale_code: 'F001', display_name: 'Manager F001' },
  { email: 'general.manager@test.com', password: 'Test1234!', role: 'MANAGER_GENERAL', filiale_code: null, display_name: 'General Manager' }
]

async function getUserByEmail(email) {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (list.error) throw list.error
  return list.data?.users?.find(u => u.email === email) || null
}

async function ensureUser(acc) {
  let userId
  const existing = await getUserByEmail(acc.email)

  if (existing) {
    userId = existing.id
    await supabase.auth.admin.updateUserById(userId, {
      password: acc.password,
      email_confirm: true
    })
  } else {
    const res = await supabase.auth.admin.createUser({
      email: acc.email,
      password: acc.password,
      email_confirm: true
    })
    if (res.error) throw res.error
    userId = res.data.user.id
  }

  const { error: upsertError } = await supabase.from('profiles').upsert({
    id: userId,
    email: acc.email,
    role: acc.role,
    filiale_code: acc.filiale_code,
    display_name: acc.display_name
  })
  if (upsertError) throw upsertError

  console.log(`OK: ${acc.email} (${acc.role})`)
}

async function main() {
  for (const acc of accounts) {
    await ensureUser(acc)
  }
  console.log('Termine')
}

main().catch(err => {
  console.error('Erreur:', err)
  process.exit(1)
})
