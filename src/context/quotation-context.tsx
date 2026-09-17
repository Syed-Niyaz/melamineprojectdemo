'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

  const fetchQuotationsFromSupabase = async () => {
    const supabase = createClient()
    if (!supabase) return

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

      if (dbQuotations && !error && dbQuotations.length > 0) {
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
          }
          return {
            id: qNumber,
            customer_id: q.customer_id,
            customerName: cust.name || 'Customer',
            customer: customerObj,
            salesperson_id: q.salesperson_id,
            salesperson: q.profiles?.full_name || 'Sales Representative',
            date: q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            discount: Number(q.discount_total) || 0,
            grandTotal: Number(q.grand_total) || 0,
            subtotal: Number(q.subtotal) || 0,
            vat_amount: Number(q.vat_amount) || 0,
            status: q.status || 'Draft',
            paymentTerms: q.payment_terms || '',
            deliveryTerms: q.delivery_terms || '',
            remarks: q.remarks || '',
            items: (q.quotation_items || []).map((qi: any, idx: number) => {
              const variant = qi.product_variants || {}
              const product = variant.products || {}
              return {
                id: qi.id || (idx + 1),
                name: product.description || 'Product Item',
                sku: product.item_no || '',
                color: variant.color || '',
                qty: qi.quantity || 1,
                quantity: qi.quantity || 1,
                price: Number(qi.unit_price_snapshot) || 0,
                unitPrice: Number(qi.unit_price_snapshot) || 0,
                unit_price_snapshot: Number(qi.unit_price_snapshot) || 0,
                discount: Number(qi.discount_percentage) || 0,
                discount_percentage: Number(qi.discount_percentage) || 0,
                discount_amount: Number(qi.discount_amount) || 0,
                amount: Number(qi.line_amount) || 0,
                line_amount: Number(qi.line_amount) || 0,
                product: {
                  name_en: product.description || 'Product Item',
                  name_ar: product.arabic_description || '',
                  sku: product.item_no || '',
                  price_bw: Number(qi.unit_price_snapshot) || 0,
                  price_colored: Number(qi.unit_price_snapshot) || 0,
                },
              }
            }),
            created_at: q.created_at,
          }
        })
        setQuotations(formatted)
        localStorage.setItem('global_quotations_v2', JSON.stringify(formatted))
      } else if (dbQuotations && dbQuotations.length === 0) {
        // Fallback to local storage or initial
        const stored = localStorage.getItem('global_quotations_v2')
        if (stored) {
          setQuotations(JSON.parse(stored))
        } else {
          setQuotations(INITIAL_QUOTATIONS)
        }
      }
    } catch (err) {
      console.error('Error fetching quotations from Supabase:', err)
    }
  }

  useEffect(() => {
    // Initial load from local storage
    const stored = localStorage.getItem('global_quotations_v2')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setQuotations(parsed)
      } catch {
        setQuotations(INITIAL_QUOTATIONS)
      }
    } else {
      setQuotations(INITIAL_QUOTATIONS)
    }
    setIsLoaded(true)

    // Live Supabase fetch
    fetchQuotationsFromSupabase()

    // Realtime Supabase Channel
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('realtime_quotations_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotations' },
        (_payload: any) => {
          fetchQuotationsFromSupabase()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quotation_items' },
        (_payload: any) => {
          fetchQuotationsFromSupabase()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discount_approvals' },
        (_payload: any) => {
          fetchQuotationsFromSupabase()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const addQuotation = async (q: Quotation) => {
    // Optimistic UI state update (salesperson's browser)
    setQuotations(prev => {
      const filtered = prev.filter(existing => existing.id !== q.id)
      return [q, ...filtered]
    })
    localStorage.setItem('global_quotations_v2', JSON.stringify([q, ...quotations]))

    const supabase = createClient()
    if (!supabase) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('addQuotation: no authenticated user')
        return
      }

      // Find or create customer UUID
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
          const { data: newCust, error: custErr } = await supabase.from('customers').insert({
            name: q.customerName,
            created_by: user.id,
          }).select('id').single()
          if (custErr) console.error('addQuotation: failed to create customer', custErr)
          customerUuid = newCust?.id
        }
      }

      if (!customerUuid) {
        console.error('addQuotation: no customer UUID, skipping Supabase insert')
        return
      }

      // q.discount is the max discount percentage (e.g. 26)
      // q.discount_total is the total SAR discount amount
      const maxDiscountPct = q.discount || 0
      const discountSarAmount = q.discount_total || 0

      const { data: insertedQuotation, error: qErr } = await supabase.from('quotations').insert({
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

      if (qErr || !insertedQuotation) {
        console.error('addQuotation: Supabase insert failed', qErr)
        return
      }

      // ── Insert quotation_items into the database ──
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

            // Try to find or create the product_variant_id
            let variantId: string | null = null

            // First, check if product exists in the DB by sku/item_no
            const productSku = product.sku || product.item_no || ''
            if (productSku) {
              const { data: dbProduct } = await supabase
                .from('products')
                .select('id')
                .eq('item_no', productSku)
                .maybeSingle()

              if (dbProduct) {
                // Look for existing variant with this color
                const { data: dbVariant } = await supabase
                  .from('product_variants')
                  .select('id')
                  .eq('product_id', dbProduct.id)
                  .ilike('color', color)
                  .maybeSingle()

                if (dbVariant) {
                  variantId = dbVariant.id
                } else {
                  // Create the variant
                  const { data: newVariant } = await supabase
                    .from('product_variants')
                    .insert({
                      product_id: dbProduct.id,
                      color: color,
                      stock_quantity: 100,
                    })
                    .select('id')
                    .single()
                  if (newVariant) variantId = newVariant.id
                }
              }
            }

            // If no variant found, create a placeholder product + variant so FK is valid
            if (!variantId) {
              const placeholderName = product.name_en || product.name || `Product ${product.sku || 'Unknown'}`
              const { data: newProduct } = await supabase
                .from('products')
                .insert({
                  item_no: productSku || `LOCAL-${product.id || Date.now()}`,
                  description: placeholderName,
                  arabic_description: product.name_ar || placeholderName,
                  category: product.category || 'General',
                  unit_price: unitPrice,
                })
                .select('id')
                .single()

              if (newProduct) {
                const { data: newVariant } = await supabase
                  .from('product_variants')
                  .insert({
                    product_id: newProduct.id,
                    color: color,
                    stock_quantity: 100,
                  })
                  .select('id')
                  .single()
                if (newVariant) variantId = newVariant.id
              }
            }

            if (variantId) {
              const { error: itemErr } = await supabase.from('quotation_items').insert({
                quotation_id: insertedQuotation.id,
                product_variant_id: variantId,
                quantity: qty,
                unit_price_snapshot: unitPrice,
                discount_percentage: discountPct,
                discount_amount: discountAmt,
                line_amount: lineAmount,
              })
              if (itemErr) console.error('addQuotation: failed to insert quotation_item', itemErr)
            } else {
              console.error('addQuotation: could not resolve product_variant_id for item', item)
            }
          } catch (itemError) {
            console.error('addQuotation: error inserting quotation item', itemError)
          }
        }
      }

      // Create discount_approval record if needed
      if (q.status === 'Pending Approval' || maxDiscountPct > 25) {
        const { error: daErr } = await supabase.from('discount_approvals').insert({
          quotation_id: insertedQuotation.id,
          status: 'Pending',
        })
        if (daErr) console.error('addQuotation: discount_approvals insert failed', daErr)
      }

      // Update local state with the real quotation number from DB so IDs stay in sync
      if (insertedQuotation.quotation_number) {
        const dbId = `QT-${1000 + insertedQuotation.quotation_number}`
        setQuotations(prev => prev.map(existing =>
          existing.id === q.id ? { ...existing, id: dbId } : existing
        ))
      }
    } catch (err) {
      console.error('addQuotation: unexpected error', err)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    // Optimistic UI state update
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, status } : q))
    localStorage.setItem('global_quotations_v2', JSON.stringify(quotations.map(q => q.id === id ? { ...q, status } : q)))

    // Call server action to bypass strict RLS on UPDATE
    await updateQuotationStatusInDB(id, status)

    // ── Deduct stock only when Quotation is marked as Completed ──
    if (status === 'Completed' || status === 'Customer Accepted') {
      const quotation = quotations.find(q => q.id === id)
      if (quotation?.items && quotation.items.length > 0) {
        // 1. Update products in localStorage immediately for instant UI refresh
        try {
          const savedProducts = localStorage.getItem('global_products_v2')
          if (savedProducts) {
            const allProducts = JSON.parse(savedProducts)
            const updatedProducts = allProducts.map((p: any) => {
              const matchingItems = (quotation.items || []).filter((item: any) => {
                const product = item.product || {}
                return (
                  String(p.id).toLowerCase() === String(product.id || '').toLowerCase() ||
                  String(p.sku).toLowerCase() === String(product.sku || '').toLowerCase()
                )
              })
              if (matchingItems.length === 0) return p
              return {
                ...p,
                variants: p.variants.map((v: any) => {
                  const match = matchingItems.find((item: any) =>
                    String(v.color).trim().toUpperCase() === String(item.color || '').trim().toUpperCase()
                  )
                  if (!match) return v
                  const qty = Number(match.qty || match.quantity || 0)
                  return {
                    ...v,
                    stock: Math.max(0, v.stock - qty),
                    sales: (v.sales || 0) + qty,
                  }
                }),
              }
            })
            localStorage.setItem('global_products_v2', JSON.stringify(updatedProducts))
            // Notify all components using useProducts() to re-read from localStorage
            window.dispatchEvent(new Event('stock_updated'))
          }
        } catch (e) {
          console.error('updateStatus: failed to update products in localStorage', e)
        }

        // 2. Deduct stock in Supabase for persistence
        const supabase = createClient()
        if (supabase) {
          for (const item of quotation.items) {
            try {
              const product = item.product || {}
              const color = String(item.color || '').trim().toUpperCase()
              const qty = Number(item.qty || item.quantity || 0)
              if (!qty) continue

              // Find product by SKU
              const sku = product.sku || product.item_no || ''
              if (!sku) continue

              const { data: dbProduct } = await supabase
                .from('products')
                .select('id')
                .eq('item_no', sku)
                .maybeSingle()

              if (!dbProduct) continue

              const { data: dbVariant } = await supabase
                .from('product_variants')
                .select('id, stock_quantity')
                .eq('product_id', dbProduct.id)
                .ilike('color', color)
                .maybeSingle()

              if (!dbVariant) continue

              const newStock = Math.max(0, (dbVariant.stock_quantity || 0) - qty)
              await supabase
                .from('product_variants')
                .update({ stock_quantity: newStock })
                .eq('id', dbVariant.id)
            } catch (itemErr) {
              console.error('updateStatus: failed to deduct stock for item', item, itemErr)
            }
          }
        }
      }
    }
  }

  const deleteQuotation = async (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id))
    localStorage.setItem('global_quotations_v2', JSON.stringify(quotations.filter(q => q.id !== id)))

    // Call server action to bypass missing DELETE RLS policy
    await deleteQuotationInDB(id)
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
