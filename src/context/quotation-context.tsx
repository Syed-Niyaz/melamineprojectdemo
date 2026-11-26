'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateQuotationStatusInDB, deleteQuotationInDB } from '@/app/actions/quotation-actions'

export type QuotationItem = {
  id?: string
  productId?: string
  item_no?: string
  productName?: string
  color?: string
  quantity: number
  unitPrice: number
  unit_price_snapshot?: number
  discount_percentage?: number
  discount_amount?: number
  line_amount: number
}

export type Quotation = {
  id: string
  customer_id?: string
  customerName: string
  salesperson_id?: string
  salesperson: string
  date: string
  discount: number
  discount_total?: number
  subtotal?: number
  vat_amount?: number
  grandTotal: number
  status: string // 'Draft', 'Pending Approval', 'Approved', 'Rejected', 'Sent', 'Customer Accepted', 'Completed', 'Cancelled'
  items?: any[]
  remarks?: string
  paymentTerms?: string
  deliveryTerms?: string
  created_at?: string
}

const INITIAL_QUOTATIONS: Quotation[] = [
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

type QuotationContextType = {
  quotations: Quotation[]
  addQuotation: (q: Quotation) => Promise<void>
  updateStatus: (id: string, status: string) => Promise<void>
  deleteQuotation: (id: string) => Promise<void>
  refreshQuotations: () => Promise<void>
}

const QuotationContext = createContext<QuotationContextType | undefined>(undefined)

export function QuotationProvider({ children }: { children: ReactNode }) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch quotations from server persistent store (/api/quotations)
  const fetchQuotationsFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/quotations')
      if (res.ok) {
        const data = await res.json()
        if (data?.quotations && Array.isArray(data.quotations) && data.quotations.length > 0) {
          setQuotations(data.quotations)
          try {
            localStorage.setItem('global_quotations_v2', JSON.stringify(data.quotations))
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error fetching quotations from server API:', err)
    }
  }, [])

  const fetchQuotationsFromSupabase = useCallback(async () => {
    // Always fetch from Supabase DB first — it is the cross-device source of truth
    const supabase = createClient()

    if (supabase) {
      try {
        const { data: dbQuotations, error } = await supabase
          .from('quotations')
          .select(`
            id,
            quotation_number,
            customer_id,
            salesperson_id,
            status,
            subtotal,
            discount_total,
            net_amount,
            vat_amount,
            grand_total,
            payment_terms,
            delivery_terms,
            remarks,
            created_at,
            customers (
              id,
              name,
              mobile_no,
              email,
              address
            ),
            profiles (
              id,
              full_name,
              email
            ),
            quotation_items (
              id,
              product_variant_id,
              quantity,
              unit_price_snapshot,
              discount_percentage,
              discount_amount,
              line_amount,
              product_variants (
                id,
                color,
                products (
                  id,
                  item_no,
                  description,
                  arabic_description
                )
              )
            )
          `)
          .order('created_at', { ascending: false })

        if (!error && dbQuotations) {
          if (dbQuotations.length > 0) {
            const formatted: Quotation[] = dbQuotations.map((q: any) => {
              const qNumber = q.quotation_number ? `QT-${1000 + q.quotation_number}` : q.id.substring(0, 8).toUpperCase()
              const cust = q.customers || {}
              const customerObj = {
                id: cust.id || q.customer_id,
                name: cust.name || 'Customer',
                contact_person: cust.name || 'Customer',
                contact: cust.name || 'Customer',
                mobile_no: cust.mobile_no || '',
                email: cust.email || '',
                address: cust.address || '',
                vat_no: '',
                cr_no: '',
                orders: 0
              }

              const rawItems = q.quotation_items || []
              const mappedItems = rawItems.map((item: any) => {
                const variant = item.product_variants || {}
                const prod = variant.products || {}
                const unitPrice = Number(item.unit_price_snapshot) || Number(prod.unit_price) || 0
                const qty = Number(item.quantity) || 1
                const discPct = Number(item.discount_percentage) || 0
                const discAmt = Number(item.discount_amount) || (unitPrice * qty * (discPct / 100))
                const lineAmt = Number(item.line_amount) || (unitPrice * qty - discAmt)
                const colorName = variant.color || 'WHITE'
                const isBW = colorName.toUpperCase() === 'BLACK' || colorName.toUpperCase() === 'WHITE'
                const priceBw = unitPrice
                const priceCol = Number((unitPrice * 1.15).toFixed(2))

                return {
                  id: item.id,
                  productId: prod.id || variant.id,
                  productName: prod.description || 'Product',
                  color: colorName,
                  quantity: qty,
                  unitPrice: unitPrice,
                  unit_price_snapshot: unitPrice,
                  discount_percentage: discPct,
                  discount_amount: discAmt,
                  line_amount: lineAmt,
                  product: {
                    id: prod.id || variant.id,
                    name_en: prod.description || 'Product',
                    name_ar: prod.arabic_description || prod.description || 'منتج',
                    sku: prod.item_no || 'SKU',
                    category: 'General',
                    price_bw: priceBw,
                    price_colored: priceCol,
                    image_color: 'bg-slate-100',
                    base_image_url: '/images/cup_saucer',
                    image_url: '/images/cup_saucer.png',
                    variants: [
                      { color: colorName, stock: 100, sales: 0 }
                    ]
                  }
                }
              })

              const maxItemDiscount = mappedItems.length > 0
                ? Math.max(...mappedItems.map((it: any) => Number(it.discount_percentage) || 0))
                : 0

              return {
                id: qNumber,
                customer_id: q.customer_id,
                customerName: cust.name || 'Customer',
                customer: customerObj,
                salesperson_id: q.salesperson_id,
                salesperson: q.profiles?.full_name || 'Ahmad Al Rashid',
                date: q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                discount: maxItemDiscount,
                discount_total: Number(q.discount_total) || 0,
                subtotal: Number(q.subtotal) || 0,
                vat_amount: Number(q.vat_amount) || 0,
                grandTotal: Number(q.grand_total) || 0,
                status: q.status || 'Draft',
                remarks: q.remarks || '',
                paymentTerms: q.payment_terms || 'Payment within 30 days',
                deliveryTerms: q.delivery_terms || 'Standard Delivery',
                created_at: q.created_at,
                items: mappedItems,
              }
            })

            // Merge: Supabase DB rows take precedence over local-only entries
            let merged = formatted
            try {
              const currentLocal = JSON.parse(localStorage.getItem('global_quotations_v2') || '[]')
              if (Array.isArray(currentLocal) && currentLocal.length > 0) {
                // Keep local-only quotations (not in DB) for offline/demo entries
                const extraLocal = currentLocal.filter((lq: Quotation) =>
                  !formatted.some(fq => fq.id === lq.id)
                )
                merged = [...formatted, ...extraLocal]
              }
            } catch {}

            setQuotations(merged)
            try {
              localStorage.setItem('global_quotations_v2', JSON.stringify(merged))
            } catch {}
            return // Successfully loaded from Supabase — skip local JSON fallback
          }
        }
      } catch (err) {
        console.error('Error fetching quotations from Supabase:', err)
      }
    }

    // Fallback: fetch from local server JSON (demo mode / no Supabase session)
    await fetchQuotationsFromServer()
  }, [fetchQuotationsFromServer])

  useEffect(() => {
    // 1. Initial load from local storage (instant render)
    try {
      const stored = localStorage.getItem('global_quotations_v2')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuotations(parsed)
        }
      }
    } catch {}
    setIsLoaded(true)

    // 2. Immediately fetch from BOTH server JSON and Supabase DB on mount
    fetchQuotationsFromSupabase()

    // 3. Poll Supabase DB every 5 seconds so Admin always sees Salesperson quotations
    //    (Supabase is the source of truth — works across devices, tabs, and Vercel deployments)
    const pollInterval = setInterval(() => {
      fetchQuotationsFromSupabase()
    }, 5000)

    // 4. Sync immediately when window is refocused or visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchQuotationsFromSupabase()
      }
    }
    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    // 5. Cross-tab sync in same browser
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('global_quotations_v2')
        if (saved) {
          setQuotations(JSON.parse(saved))
        }
      } catch {}
    }
    window.addEventListener('storage', handleSync)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('storage', handleSync)
    }
  }, [fetchQuotationsFromSupabase])

  const addQuotation = async (q: Quotation) => {
    // 1. Optimistic UI state update
    setQuotations(prev => {
      const filtered = prev.filter(existing => existing.id !== q.id)
      const updated = [q, ...filtered]
      try {
        localStorage.setItem('global_quotations_v2', JSON.stringify(updated))
      } catch {}
      return updated
    })

    // 2. Save directly to server persistent JSON store (/api/quotations)
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', quotation: q }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.quotations) {
          setQuotations(data.quotations)
          try {
            localStorage.setItem('global_quotations_v2', JSON.stringify(data.quotations))
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to save quotation to server API:', e)
    }

    // 3. Best-effort Supabase sync — required so Admin can see ALL quotations cross-device
    const supabase = createClient()
    if (!supabase) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Not authenticated with Supabase — quotation saved locally only (demo mode)
        // Trigger a refresh so any Supabase-sourced quotations are still shown
        setTimeout(() => fetchQuotationsFromSupabase(), 1000)
        return
      }

      // Find or create customer UUID in Supabase
      let customerUuid = q.customer_id
      if (!customerUuid || customerUuid.length < 10) {
        const { data: foundCust } = await supabase
          .from('customers')
          .select('id')
          .ilike('name', `%${q.customerName}%`)
          .maybeSingle()

        if (foundCust) {
          customerUuid = foundCust.id
        } else {
          const { data: newCust } = await supabase.from('customers').insert({
            name: q.customerName,
            created_by: user.id,
          }).select('id').single()
          customerUuid = newCust?.id
        }
      }

      if (!customerUuid) return

      const maxDiscountPct = q.discount || 0
      const discountSarAmount = q.discount_total || 0

      const { data: insertedQuotation } = await supabase.from('quotations').insert({
        customer_id: customerUuid,
        salesperson_id: user.id,
        status: q.status || 'Draft',
        subtotal: q.subtotal || 0,
        discount_total: discountSarAmount,
        net_amount: q.grandTotal / 1.15,
        vat_rate: 15.00,
        vat_amount: q.vat_amount || (q.grandTotal - q.grandTotal / 1.15),
        grand_total: q.grandTotal,
        payment_terms: q.paymentTerms,
        delivery_terms: q.deliveryTerms,
        remarks: q.remarks,
      }).select('id, quotation_number').single()

      if (!insertedQuotation) return

      // Insert quotation_items if available
      if (q.items && q.items.length > 0) {
        for (const item of q.items) {
          try {
            const product = item.product || ({} as any)
            const color = (item.color || product.variants?.[0]?.color || 'WHITE').toUpperCase()
            const isBW = color === 'BLACK' || color === 'WHITE'
            const unitPrice = item.unitPrice || item.unit_price_snapshot || (isBW ? product.price_bw : product.price_colored) || 0
            const qty = item.qty || item.quantity || 1
            const discountPct = Number(item.discount || item.discount_percentage || 0)
            const discountAmt = unitPrice * qty * (discountPct / 100)
            const lineAmount = item.line_amount || (unitPrice * qty - discountAmt)

            let variantId: string | null = null
            const productSku = product.sku || product.item_no || ''
            if (productSku) {
              const { data: dbProduct } = await supabase
                .from('products')
                .select('id')
                .eq('item_no', productSku)
                .maybeSingle()

              if (dbProduct) {
                const { data: dbVariant } = await supabase
                  .from('product_variants')
                  .select('id')
                  .eq('product_id', dbProduct.id)
                  .ilike('color', color)
                  .maybeSingle()

                if (dbVariant) {
                  variantId = dbVariant.id
                }
              }
            }

            if (variantId) {
              await supabase.from('quotation_items').insert({
                quotation_id: insertedQuotation.id,
                product_variant_id: variantId,
                quantity: qty,
                unit_price_snapshot: unitPrice,
                discount_percentage: discountPct,
                discount_amount: discountAmt,
                line_amount: lineAmount,
              })
            }
          } catch {}
        }
      }

      if (q.status === 'Pending Approval' || maxDiscountPct > 25) {
        await supabase.from('discount_approvals').insert({
          quotation_id: insertedQuotation.id,
          status: 'Pending',
        })
      }
    } catch (err) {
      console.error('addQuotation: background sync error', err)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    // 1. Optimistic UI update
    setQuotations(prev => {
      const updated = prev.map(q => q.id === id ? { ...q, status } : q)
      try {
        localStorage.setItem('global_quotations_v2', JSON.stringify(updated))
      } catch {}
      return updated
    })

    // 2. Persist to server API (/api/quotations)
    try {
      await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', id, status }),
      })
    } catch (e) {
      console.error('Failed to update quotation status on server API:', e)
    }

    // 3. Call server action for Supabase DB, then refresh from DB so both sides are in sync
    try {
      await updateQuotationStatusInDB(id, status)
      // Re-fetch from Supabase so the latest DB state is reflected immediately
      setTimeout(() => fetchQuotationsFromSupabase(), 500)
    } catch {}

    // 4. Deduct stock when Quotation is Completed
    if (status === 'Completed' || status === 'Customer Accepted') {
      const quotation = quotations.find(q => q.id === id)
      if (quotation?.items && quotation.items.length > 0) {
        for (const item of quotation.items) {
          const product = item.product || {}
          const color = String(item.color || '').trim().toUpperCase()
          const qty = Number(item.qty || item.quantity || 0)
          const pId = product.id || product.sku
          if (pId && color && qty > 0) {
            try {
              await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deductStock', productId: pId, color, qty }),
              })
            } catch {}
          }
        }
      }
    }

    // 5. Broadcast notification on status change so all connected devices are notified
    try {
      const targetQ = quotations.find(q => q.id === id)
      let notifPayload: any = null
      if (status === 'Admin Accepted' || status === 'Approved') {
        notifPayload = {
          type: 'quotation_approved',
          targetRole: 'salesperson',
          title: 'Quotation Approved',
          message: `Admin approved quotation ${id} for ${targetQ?.customerName || 'Customer'}.`,
          quotationId: id,
          customerName: targetQ?.customerName,
          salespersonName: targetQ?.salesperson,
          link: '/quotations',
        }
      } else if (status === 'Rejected') {
        notifPayload = {
          type: 'quotation_rejected',
          targetRole: 'salesperson',
          title: 'Quotation Rejected',
          message: `Admin rejected quotation ${id} for ${targetQ?.customerName || 'Customer'}.`,
          quotationId: id,
          customerName: targetQ?.customerName,
          salespersonName: targetQ?.salesperson,
          link: '/quotations',
        }
      } else if (status === 'Completed') {
        notifPayload = {
          type: 'quotation_completed',
          targetRole: 'all',
          title: 'Order Completed',
          message: `Quotation ${id} for ${targetQ?.customerName || 'Customer'} was marked as Completed.`,
          quotationId: id,
          customerName: targetQ?.customerName,
          salespersonName: targetQ?.salesperson,
          link: '/quotations',
        }
      }

      if (notifPayload) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', notification: notifPayload }),
        }).catch(() => {})
      }
    } catch {}
  }

  const deleteQuotation = async (id: string) => {
    setQuotations(prev => {
      const updated = prev.filter(q => q.id !== id)
      try {
        localStorage.setItem('global_quotations_v2', JSON.stringify(updated))
      } catch {}
      return updated
    })

    try {
      await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
    } catch (e) {
      console.error('Failed to delete quotation on server API:', e)
    }

    try {
      await deleteQuotationInDB(id)
    } catch {}
  }

  return (
    <QuotationContext.Provider
      value={{
        quotations,
        addQuotation,
        updateStatus,
        deleteQuotation,
        refreshQuotations: fetchQuotationsFromSupabase,
      }}
    >
      {children}
    </QuotationContext.Provider>
  )
}

export function useQuotations() {
  const context = useContext(QuotationContext)
  if (context === undefined) {
    throw new Error('useQuotations must be used within a QuotationProvider')
  }
  return context
}
