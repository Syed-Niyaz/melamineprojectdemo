import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export type NotificationType =
  | 'quotation_created'
  | 'pending_approval'
  | 'quotation_approved'
  | 'quotation_rejected'
  | 'quotation_completed'
  | 'general'

export type AppNotification = {
  id: string
  type: NotificationType
  targetRole: 'admin' | 'salesperson' | 'all'
  title: string
  message: string
  quotationId?: string
  customerName?: string
  salespersonName?: string
  link: string
  createdAt: string
  read: boolean
}

const DATA_DIR = path.join(process.cwd(), 'data')
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json')

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'pending_approval',
    targetRole: 'admin',
    title: 'Discount Approval Required',
    message: 'Ahmad Al Rashid requested a 28% discount on Quotation QT-1005 for Al Safa Trading (SAR 14,200.00).',
    quotationId: 'QT-1005',
    customerName: 'Al Safa Trading',
    salespersonName: 'Ahmad Al Rashid',
    link: '/admin/approvals',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
  },
  {
    id: 'notif-2',
    type: 'quotation_created',
    targetRole: 'admin',
    title: 'New Quotation Created',
    message: 'Sarah Chen created new quotation QT-1008 for Al Fanar Ceramics (SAR 18,400.00).',
    quotationId: 'QT-1008',
    customerName: 'Al Fanar Ceramics',
    salespersonName: 'Sarah Chen',
    link: '/admin/quotations',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
  },
  {
    id: 'notif-3',
    type: 'quotation_completed',
    targetRole: 'admin',
    title: 'Order Completed',
    message: 'Quotation QT-1002 for Saudi Ceramic Co. has been marked as Completed (SAR 8,900.00).',
    quotationId: 'QT-1002',
    customerName: 'Saudi Ceramic Co.',
    salespersonName: 'Marcus Johnson',
    link: '/admin/analytics/status/completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
  },
  {
    id: 'notif-4',
    type: 'quotation_approved',
    targetRole: 'salesperson',
    title: 'Quotation Approved by Admin',
    message: 'Admin accepted quotation QT-1005 for Al Safa Trading. You can now send it to the client.',
    quotationId: 'QT-1005',
    customerName: 'Al Safa Trading',
    salespersonName: 'Ahmad Al Rashid',
    link: '/quotations',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    read: false,
  },
]

function getStoredNotifications(): AppNotification[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(INITIAL_NOTIFICATIONS, null, 2), 'utf-8')
      return INITIAL_NOTIFICATIONS
    }
    const content = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return INITIAL_NOTIFICATIONS
  } catch (err) {
    console.error('Error reading notifications.json:', err)
    return INITIAL_NOTIFICATIONS
  }
}

function saveStoredNotifications(notifications: AppNotification[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error saving notifications.json:', err)
    return false
  }
}

// GET /api/notifications
export async function GET() {
  const notifications = getStoredNotifications()
  return NextResponse.json({ notifications })
}

// POST /api/notifications
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'add', notification, id, role, notifications: batchNotifications } = body
    let current = getStoredNotifications()

    if (action === 'add' && notification) {
      const newNotif: AppNotification = {
        ...notification,
        id: notification.id || ('notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
        createdAt: notification.createdAt || new Date().toISOString(),
        read: notification.read ?? false,
      }
      current = [newNotif, ...current.filter(n => n.id !== newNotif.id)]
    } else if (action === 'markAsRead' && id) {
      current = current.map(n => n.id === id ? { ...n, read: true } : n)
    } else if (action === 'markAllAsRead') {
      current = current.map(n => {
        if (!role || n.targetRole === role || n.targetRole === 'all') {
          return { ...n, read: true }
        }
        return n
      })
    } else if (action === 'delete' && id) {
      current = current.filter(n => n.id !== id)
    } else if (action === 'clearAll') {
      current = current.filter(n => role && n.targetRole !== role && n.targetRole !== 'all')
    } else if (action === 'sync' && Array.isArray(batchNotifications)) {
      const mergedMap = new Map<string, AppNotification>()
      current.forEach(n => mergedMap.set(n.id, n))
      batchNotifications.forEach((n: AppNotification) => mergedMap.set(n.id, n))
      current = Array.from(mergedMap.values())
    }

    saveStoredNotifications(current)

    return NextResponse.json({ success: true, notifications: current })
  } catch (err: any) {
    console.error('API notifications error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
