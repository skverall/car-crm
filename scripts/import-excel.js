/*
  Script: Import data from 'AydMaxx Calc EXpenses.xlsx' into Supabase
  Usage:
    - Set env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    - Run: node scripts/import-excel.js

  Notes:
    - This is a skeleton to parse sheets: Investors, Expenses, Inventory, Extra income
    - It maps to tables: investors, expenses(+investor_id), cars(+car_investors), extra_income
*/

const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function toNumber(val) {
  if (val == null || val === '') return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

function toDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().slice(0,10)
  // Excel date serial
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    return d.toISOString().slice(0,10)
  }
  // String date pass-through
  try { return new Date(val).toISOString().slice(0,10) } catch { return null }
}

async function upsertInvestorByName(name, email, initial_capital) {
  const { data, error } = await supabase
    .from('investors')
    .upsert({ name, email, initial_capital: initial_capital ?? 0 }, { onConflict: 'name' })
    .select('*')
  if (error) throw error
  return data[0]
}

async function run() {
  const filePath = path.resolve(__dirname, '..', 'AydMaxx Calc EXpenses.xlsx')
  if (!fs.existsSync(filePath)) {
    console.error('Excel file not found at', filePath)
    process.exit(1)
  }
  const wb = xlsx.readFile(filePath)

  // Investors sheet
  if (wb.Sheets['Investors']) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Investors'])
    for (const r of rows) {
      const name = r['Investor'] || r['Name']
      if (!name) continue
      const initial = toNumber(r['Initial Investment']) || 0
      const email = r['Email'] || null
      await upsertInvestorByName(name, email, initial)
    }
    console.log('Investors imported:', rows.length)
  }

  // Inventory sheet -> cars and car_investors (basic)
  if (wb.Sheets['Inventory']) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Inventory'])
    for (const r of rows) {
      const vin = (r['VIN'] || '').toString().trim()
      if (!vin) continue
      const car = {
        vin,
        make: (r['Make/Model'] || '').toString().split(' ')[0] || 'Unknown',
        model: (r['Make/Model'] || '').toString(),
        year: toNumber(r['Year']) || new Date().getFullYear(),
        purchase_price: toNumber(r['Purchase Price']) || 0,
        purchase_currency: 'AED',
        purchase_date: toDate(r['Date Purchased']) || new Date().toISOString().slice(0,10),
        status: (r['Status'] || 'in_transit').toString(),
      }
      const { data: carIns, error: carErr } = await supabase.from('cars').insert(car).select('id')
      if (carErr) { console.error('Car insert error:', carErr.message); continue }
      const car_id = carIns?.[0]?.id

      const investorName = r['Investor']
      if (car_id && investorName) {
        const inv = await upsertInvestorByName(investorName, null, 0)
        await supabase.from('car_investors').upsert({ car_id, investor_id: inv.id, share: 1, capital_contribution: car.purchase_price })
      }
    }
    console.log('Inventory imported')
  }

  // Expenses sheet -> expenses (with investor mapping)
  if (wb.Sheets['Expenses']) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Expenses'])
    for (const r of rows) {
      const vin = (r['VIN'] || '').toString().trim()
      const { data: carByVin } = await supabase.from('cars').select('id').eq('vin', vin).limit(1)
      const car_id = carByVin?.[0]?.id || null
      const investorName = r['Investor'] || null
      let investor_id = null
      if (investorName) {
        const inv = await upsertInvestorByName(investorName, null, 0)
        investor_id = inv.id
      }
      const expense = {
        car_id,
        category: (r['Category'] || 'other').toString(),
        description: (r['Description'] || '').toString(),
        amount: toNumber(r['Amount']) || 0,
        currency: 'AED',
        expense_date: toDate(r['Date']) || new Date().toISOString().slice(0,10),
        notes: r['Notes'] || null,
        investor_id,
      }
      const { error } = await supabase.from('expenses').insert(expense)
      if (error) console.error('Expense insert error:', error.message)
    }
    console.log('Expenses imported')
  }

  // Extra income sheet -> extra_income
  if (wb.Sheets['Extra income']) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets['Extra income'])
    for (const r of rows) {
      const vin = (r['VIN'] || '').toString().trim()
      let car_id = null
      if (vin) {
        const { data: carByVin } = await supabase.from('cars').select('id').eq('vin', vin).limit(1)
        car_id = carByVin?.[0]?.id || null
      }
      const investorName = r['Investor'] || null
      let investor_id = null
      if (investorName) {
        const inv = await upsertInvestorByName(investorName, null, 0)
        investor_id = inv.id
      }
      const rec = {
        income_date: toDate(r['Date']) || new Date().toISOString().slice(0,10),
        source: (r['Source'] || '').toString(),
        amount: toNumber(r['Amount']) || 0,
        currency: 'AED',
        car_id,
        investor_id,
        note: r['Notes'] || null,
      }
      const { error } = await supabase.from('extra_income').insert(rec)
      if (error) console.error('Extra income insert error:', error.message)
    }
    console.log('Extra income imported')
  }

  console.log('Import completed.')
}

run().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})

