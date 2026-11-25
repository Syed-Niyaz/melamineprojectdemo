import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json')

const INITIAL_CUSTOMERS = [
  { id: '1', name: 'Al Muhaidib Kitchens', contact_person: 'Khalid Al Muhaidib', mobile_no: '+966 13 812 3456', email: 'khalid@almuhaidib.com.sa', address: 'King Fahd Road, Al Khobar 31952', vat_no: '310123456700003', cr_no: '1010123456789', orders: 12 },
  { id: '2', name: 'Raha Kitchen Solutions', contact_person: 'Faisal Al Ghamdi', mobile_no: '+966 13 823 4567', email: 'faisal@raha-kitchens.sa', address: 'Dhahran St, Dammam', orders: 4 },
  { id: '3', name: 'Eastern Kitchens Factory', contact_person: 'Omar Al Dossari', mobile_no: '+966 13 834 5678', email: 'omar@eastern-kitchens.sa', address: 'Industrial Area, Jubail', orders: 8 },
  { id: '4', name: 'Gulf Modular Kitchens', contact_person: 'Sultan Al Harbi', mobile_no: '+966 13 845 6789', email: 'sultan@gulfmodular.sa', address: 'Prince Faisal St, Riyadh', orders: 3 },
  { id: '5', name: 'Al Jazeera Kitchen World', contact_person: 'Mohammed Al Qahtani', mobile_no: '+966 13 856 7890', email: 'mohammed@aljazeerakitchen.sa', address: 'Olaya District, Riyadh', orders: 6 },
]

function getStoredCustomers(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(CUSTOMERS_FILE)) {
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(INITIAL_CUSTOMERS, null, 2), 'utf-8')
      return INITIAL_CUSTOMERS
    }
    const content = fs.readFileSync(CUSTOMERS_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return INITIAL_CUSTOMERS
  } catch (err) {
    console.error('Error reading customers.json:', err)
    return INITIAL_CUSTOMERS
  }
}

function saveStoredCustomers(customers: any[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error saving customers.json:', err)
    return false
  }
}

// GET /api/customers
export async function GET() {
  const customers = getStoredCustomers()
  return NextResponse.json({ customers })
}

// POST /api/customers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'add', customer, id, customers: batchCustomers } = body
    let current = getStoredCustomers()

    if (action === 'add' && customer) {
      if (!customer.id) {
        customer.id = 'cust-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
      }
      const filtered = current.filter(c => c.id !== customer.id)
      current = [customer, ...filtered]
    } else if (action === 'update' && customer) {
      current = current.map(c => c.id === customer.id ? { ...c, ...customer } : c)
    } else if (action === 'delete' && id) {
      current = current.filter(c => c.id !== id)
    } else if ((action === 'sync' || Array.isArray(batchCustomers)) && Array.isArray(batchCustomers || body.customers)) {
      const list = batchCustomers || body.customers
      const mergedMap = new Map<string, any>()
      current.forEach(c => mergedMap.set(c.id, c))
      list.forEach((c: any) => mergedMap.set(c.id, c))
      current = Array.from(mergedMap.values())
    }

    saveStoredCustomers(current)

    return NextResponse.json({ success: true, customers: current })
  } catch (err: any) {
    console.error('API customers error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
