// scripts/import-kpi-excel.js
// Usage:
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-kpi-excel.js --file kpi.xlsx --filiale F001 --year 2025
// Flags: --skip-draft, --skip-b2026, --skip-forecast, --skip-opportunities, --skip-actions

const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
let XLSX
try {
  XLSX = require('xlsx')
} catch (err) {
  console.error('Missing dependency "xlsx". Run: npm install xlsx')
  process.exit(1)
}

const args = process.argv.slice(2)
const getArg = (name, def = null) => {
  const idx = args.indexOf(`--${name}`)
  if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  return def
}
const hasFlag = name => args.includes(`--${name}`)

const file = getArg('file', 'kpi.xlsx')
const defaultFiliale = getArg('filiale', 'GLOBAL')
const year = Number(getArg('year', '2025')) || 2025
const skipDraft = hasFlag('skip-draft')
const skipB2026 = hasFlag('skip-b2026')
const skipForecast = hasFlag('skip-forecast')
const skipOpp = hasFlag('skip-opportunities')
const skipActions = hasFlag('skip-actions')

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const sanitizeId = str => {
  if (!str) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
}

const toNumber = v => {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const monthColsDraft = [
  ['B', 'C'],
  ['E', 'F'],
  ['H', 'I'],
  ['K', 'L'],
  ['N', 'O'],
  ['Q', 'R'],
  ['T', 'U'],
  ['W', 'X'],
  ['Z', 'AA'],
  ['AC', 'AD'],
  ['AF', 'AG'],
  ['AI', 'AJ']
]

function parseDraft(sheet, filiale) {
  const entries = []
  let row = 3
  while (true) {
    const kpiName = sheet[`A${row}`]?.v
    if (!kpiName) break
    const kpi_id = sanitizeId(kpiName)
    monthColsDraft.forEach((cols, idx) => {
      const objectif = toNumber(sheet[`${cols[0]}${row}`]?.v)
      const realise = toNumber(sheet[`${cols[1]}${row}`]?.v)
      entries.push({
        filiale_code: filiale,
        year,
        month: idx + 1,
        kpi_id,
        objectif,
        realise,
        updated_at: new Date().toISOString()
      })
    })
    row++
  }
  return entries
}

const monthColsB2026 = ['E','F','G','H','I','J','K','L','M','N','O','P']

function parseB2026(sheet) {
  const entries = []
  let row = 4
  const yearCell = sheet['E1']?.v
  const yearBudget = Number(yearCell) || year
  while (true) {
    const produit = sheet[`A${row}`]?.v
    const plan = sheet[`B${row}`]?.v
    const territoire = sheet[`C${row}`]?.v
    const constructeur = sheet[`D${row}`]?.v
    if (!produit && !plan && !territoire && !constructeur) break

    const terrStr = (territoire || '').toString().trim()
    const isTotal = terrStr.toUpperCase().startsWith('TOTAL')
    if (isTotal || !terrStr) { row++; continue }

    const filiale = sanitizeId(terrStr || defaultFiliale)
    const kpi_id = sanitizeId(`${plan || 'KPI'}_${constructeur || ''}` || 'KPI')
    monthColsB2026.forEach((col, idx) => {
      const objectif = toNumber(sheet[`${col}${row}`]?.v)
      entries.push({
        filiale_code: filiale,
        year: yearBudget,
        month: idx + 1,
        produit: produit || null,
        plan_compte: plan || null,
        constructeur: constructeur || null,
        objectif,
        updated_at: new Date().toISOString()
      })
    })
    row++
  }
  return entries
}

function parseOpportunities(sheet) {
  const rows = []
  let row = 2
  while (true) {
    const marque = sheet[`A${row}`]?.v
    const modele = sheet[`B${row}`]?.v
    const gamme = sheet[`C${row}`]?.v
    const pays = sheet[`D${row}`]?.v
    const vendeur = sheet[`E${row}`]?.v
    const statut = sheet[`G${row}`]?.v
    const priorite = sheet[`H${row}`]?.v
    const source = sheet[`I${row}`]?.v
    if (!marque && !modele && !gamme && !pays && !vendeur && !statut && !priorite && !source) break
    rows.push({
      marque: marque || null,
      modele: modele || null,
      gamme: gamme || null,
      pays: pays || null,
      vendeur: vendeur || null,
      statut: statut || null,
      priorite: priorite || null,
      source: source || null,
      created_at: new Date().toISOString()
    })
    row++
  }
  return rows
}

function parseActions(sheet) {
  const rows = []
  let row = 3
  while (true) {
    const date = sheet[`A${row}`]?.v
    const action = sheet[`B${row}`]?.v
    const priorite = sheet[`C${row}`]?.v
    const responsable = sheet[`D${row}`]?.v
    const date_fin = sheet[`E${row}`]?.v
    const statut = sheet[`F${row}`]?.v || sheet[`G${row}`]?.v || sheet[`H${row}`]?.v
    const commentaires = sheet[`I${row}`]?.v
    if (!date && !action && !priorite && !responsable && !date_fin && !statut && !commentaires) break
    rows.push({
      date_action: date || null,
      action: action || null,
      priorite: priorite || null,
      responsable: responsable || null,
      date_fin_prevue: date_fin || null,
      statut: statut || null,
      commentaires: commentaires || null,
      created_at: new Date().toISOString()
    })
    row++
  }
  return rows
}

function parseForecast(sheet) {
  // columns: A model, B code, D..K years 2017-2024, L..W months 2026, X subtotal
  const yearCols = ['D','E','F','G','H','I','J','K']
  const yearLabels = [2017,2018,2019,2020,2021,2022,2023,2024]
  const monthCols = ['L','M','N','O','P','Q','R','S','T','U','V','W']
  const monthLabels = [1,2,3,4,5,6,7,8,9,10,11,12]
  const rows = []
  let row = 5
  while (true) {
    const model = sheet[`A${row}`]?.v
    const code = sheet[`B${row}`]?.v
    if (!model && !code) {
      // skip empty; break only if fully empty row
      const isEmpty = !sheet[`A${row}`] && !sheet[`B${row}`] && !sheet[`C${row}`]
      if (isEmpty) break
    }
    // yearly
    yearCols.forEach((col, idx) => {
      const val = toNumber(sheet[`${col}${row}`]?.v)
      if (val !== 0) rows.push({ model: model || null, code: code || null, year: yearLabels[idx], month: null, value: val })
    })
    // 2026 monthly
    monthCols.forEach((col, idx) => {
      const val = toNumber(sheet[`${col}${row}`]?.v)
      if (val !== 0) rows.push({ model: model || null, code: code || null, year: 2026, month: monthLabels[idx], value: val })
    })
    row++
    if (row > 5000) break
  }
  return rows
}

async function upsert(table, rows, conflictCols) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictCols })
  if (error) throw error
}

async function main() {
  console.log(`Reading ${file} ...`)
  const wb = XLSX.readFile(file, { cellDates: false })

  const entriesKpi = []
  const entriesBudgets = []
  const entriesOpp = []
  const entriesActions = []
  const entriesForecast = []

  if (!skipDraft) {
    const sheet = wb.Sheets["DRAFT - KPI's MANUTENTION ET AG"]
    if (sheet) {
      const parsed = parseDraft(sheet, sanitizeId(defaultFiliale))
      console.log(`Draft sheet: ${parsed.length} rows`)
      entriesKpi.push(...parsed)
    } else {
      console.warn('Sheet "DRAFT - KPI\'s MANUTENTION ET AG" not found')
    }
  }

  if (!skipB2026) {
    const sheet = wb.Sheets['B2026']
    if (sheet) {
      const parsed = parseB2026(sheet)
      console.log(`B2026 sheet: ${parsed.length} rows`)
      entriesBudgets.push(...parsed)
    } else {
      console.warn('Sheet "B2026" not found')
    }
  }

  if (!skipOpp) {
    const sheet = wb.Sheets['LISTE']
    if (sheet) {
      const parsed = parseOpportunities(sheet)
      console.log(`Opportunities sheet: ${parsed.length} rows`)
      entriesOpp.push(...parsed)
    }
  }

  if (!skipActions) {
    const sheet = wb.Sheets["Plan d'action"]
    if (sheet) {
      const parsed = parseActions(sheet)
      console.log(`Actions sheet: ${parsed.length} rows`)
      entriesActions.push(...parsed)
    }
  }

  if (!skipForecast) {
    const sheet = wb.Sheets['FORECAST']
    if (sheet) {
      const parsed = parseForecast(sheet)
      console.log(`Forecast sheet: ${parsed.length} rows`)
      entriesForecast.push(...parsed)
    }
  }

  // Merge KPI duplicates on (filiale_code, year, month, kpi_id)
  const mergeOn = (rows, keyFields) => {
    const map = new Map()
    for (const r of rows) {
      const key = keyFields.map(k => r[k]).join('|')
      if (map.has(key)) {
        const prev = map.get(key)
        map.set(key, {
          ...prev,
          objectif: (prev.objectif || 0) + (r.objectif || 0),
          realise: (prev.realise || 0) + (r.realise || 0)
        })
      } else {
        map.set(key, { ...r })
      }
    }
    return Array.from(map.values())
  }

  const mergedKpi = mergeOn(entriesKpi, ['filiale_code','year','month','kpi_id'])
  console.log(`Total KPI rows after merge: ${mergedKpi.length}`)

  console.log('Upserting KPI...')
  for (let i = 0; i < mergedKpi.length; i += 500) {
    await upsert('kpi_values', mergedKpi.slice(i, i + 500), ['filiale_code','year','month','kpi_id'])
    console.log(`KPI ${Math.min(i + 500, mergedKpi.length)} / ${mergedKpi.length}`)
  }

  console.log('Upserting Budgets...')
  for (let i = 0; i < entriesBudgets.length; i += 500) {
    await upsert(
      'budgets',
      entriesBudgets.slice(i, i + 500),
      ['filiale_code','year','month','plan_compte','constructeur','produit']
    )
    console.log(`Budgets ${Math.min(i + 500, entriesBudgets.length)} / ${entriesBudgets.length}`)
  }

  console.log('Upserting Opportunities...')
  for (let i = 0; i < entriesOpp.length; i += 500) {
    await upsert('opportunities', entriesOpp.slice(i, i + 500), ['marque','modele','pays','vendeur'])
    console.log(`Opp ${Math.min(i + 500, entriesOpp.length)} / ${entriesOpp.length}`)
  }

  console.log('Upserting Actions...')
  for (let i = 0; i < entriesActions.length; i += 500) {
    await upsert('actions', entriesActions.slice(i, i + 500), ['action','responsable','date_action'])
    console.log(`Actions ${Math.min(i + 500, entriesActions.length)} / ${entriesActions.length}`)
  }

  console.log('Upserting Forecast...')
  for (let i = 0; i < entriesForecast.length; i += 500) {
    await upsert('forecast', entriesForecast.slice(i, i + 500), ['model','code','year','month'])
    console.log(`Forecast ${Math.min(i + 500, entriesForecast.length)} / ${entriesForecast.length}`)
  }

  console.log('Import termine')
}

main().catch(err => {
  console.error('Import error:', err)
  process.exit(1)
})
