import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const QUOTATIONS_FILE = path.join(DATA_DIR, 'quotations.json')

const INITIAL_QUOTATIONS = [
  {
    id: 'QT-1001',
    customerName: 'Al Muhaidib Kitchens',
    salesperson: 'Ahmad Al Rashid',
    date: '2026-09-10',
    discount: 5,
    grandTotal: 14500.00,
    status: 'Completed',
  },
  {
    id: 'QT-1002',
    customerName: 'Raha Kitchen Solutions',
    salesperson: 'Ahmad Al Rashid',
    date: '2026-09-11',
    discount: 8,
    grandTotal: 8900.00,
    status: 'Pending Approval',
  },
  {
    id: 'QT-1003',
    customerName: 'Eastern Kitchens Factory',
    salesperson: 'Abdul Khabeer',
    date: '2026-09-12',
    discount: 0,
    grandTotal: 22300.00,
    status: 'Approved',
  },
]

function getStoredQuotations(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(QUOTATIONS_FILE)) {
      fs.writeFileSync(QUOTATIONS_FILE, JSON.stringify(INITIAL_QUOTATIONS, null, 2), 'utf-8')
      return INITIAL_QUOTATIONS
    }
    const content = fs.readFileSync(QUOTATIONS_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return INITIAL_QUOTATIONS
  } catch (err) {
    console.error('Error reading quotations.json:', err)
    return INITIAL_QUOTATIONS
  }
}

function saveStoredQuotations(quotations: any[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(QUOTATIONS_FILE, JSON.stringify(quotations, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error saving quotations.json:', err)
    return false
  }
}

// GET /api/quotations
export async function GET() {
  const quotations = getStoredQuotations()
  return NextResponse.json({ quotations })
}

// POST /api/quotations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'add', quotation, id, status, quotations: batchQuotations } = body
    let current = getStoredQuotations()

    if (action === 'add' && quotation) {
      // Prepend new quotation, replacing if matching id exists
      const filtered = current.filter(q => q.id !== quotation.id)
      current = [quotation, ...filtered]
    } else if (action === 'updateStatus' && id && status) {
      current = current.map(q => q.id === id ? { ...q, status } : q)
    } else if (action === 'delete' && id) {
      current = current.filter(q => q.id !== id)
    } else if (action === 'sync' && Array.isArray(batchQuotations)) {
      const mergedMap = new Map<string, any>()
      current.forEach(q => mergedMap.set(q.id, q))
      batchQuotations.forEach((q: any) => mergedMap.set(q.id, q))
      current = Array.from(mergedMap.values())
    } else if (quotation) {
      current = [quotation, ...current.filter(q => q.id !== quotation.id)]
    }

    saveStoredQuotations(current)

    return NextResponse.json({ success: true, quotations: current })
  } catch (err: any) {
    console.error('API quotations error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
