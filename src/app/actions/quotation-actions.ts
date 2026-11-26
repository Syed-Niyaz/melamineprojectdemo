'use server'

import { createClient } from '@supabase/supabase-js'

export async function updateQuotationStatusInDB(id: string, status: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error("Missing Supabase Service Role Key")
    return false
  }

  // Use service role key to bypass RLS policies that restrict updating non-Draft quotations
  const supabase = createClient(url, key)
  
  try {
    // Check if id is in QT-XXXX format (e.g., QT-1005)
    const isDbId = /^QT-\d+$/.test(id)
    
    if (isDbId) {
      const qNum = parseInt(id.replace('QT-', '')) - 1000
      if (!isNaN(qNum) && qNum > 0) {
        const { error } = await supabase.from('quotations').update({ status }).eq('quotation_number', qNum)
        if (error) console.error('Error updating quotation by number:', error)
      }
    } else if (id.length > 20) {
      // UUID format
      const { error } = await supabase.from('quotations').update({ status }).eq('id', id)
      if (error) console.error('Error updating quotation by UUID:', error)
    }
    
    return true
  } catch (err) {
    console.error('Failed to update quotation status in Supabase:', err)
    return false
  }
}

export async function deleteQuotationInDB(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error("Missing Supabase Service Role Key")
    return false
  }

  const supabase = createClient(url, key)
  
  try {
    const isDbId = /^QT-\d+$/.test(id)
    
    if (isDbId) {
      const qNum = parseInt(id.replace('QT-', '')) - 1000
      if (!isNaN(qNum) && qNum > 0) {
        const { error } = await supabase.from('quotations').delete().eq('quotation_number', qNum)
        if (error) console.error('Error deleting quotation by number:', error)
      }
    } else if (id.length > 20) {
      const { error } = await supabase.from('quotations').delete().eq('id', id)
      if (error) console.error('Error deleting quotation by UUID:', error)
    }
    
    return true
  } catch (err) {
    console.error('Failed to delete quotation from Supabase:', err)
    return false
  }
}

export async function saveQuotationToDB(q: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error("Missing Supabase URL or Service Role Key in saveQuotationToDB")
    return { success: false, error: "Missing Supabase configuration" }
  }

  const supabase = createClient(url, key)

  try {
    // 1. Determine salesperson profile id
    let salespersonId = q.salesperson_id
    if (!salespersonId || salespersonId === 'demo-user-id' || salespersonId.length < 10) {
      // Find a salesperson profile or fallback to any active profile
      const { data: salesProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'salesperson')
        .limit(1)
        .maybeSingle()
      
      if (salesProfile) {
        salespersonId = salesProfile.id
      } else {
        const { data: anyProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
        salespersonId = anyProfile?.id
      }
    }

    if (!salespersonId) {
      return { success: false, error: "No profile found in Supabase to link quotation" }
    }

    // 2. Resolve or create customer in Supabase
    let customerUuid = q.customer_id
    const customerName = q.customerName || q.customer?.name || 'Walk-in Customer'

    if (!customerUuid || customerUuid.length < 10) {
      const { data: foundCust } = await supabase
        .from('customers')
        .select('id')
        .ilike('name', `%${customerName}%`)
        .limit(1)
        .maybeSingle()

      if (foundCust) {
        customerUuid = foundCust.id
      } else {
        const { data: newCust, error: cErr } = await supabase.from('customers').insert({
          name: customerName,
          mobile_no: q.customer?.mobile_no || null,
          email: q.customer?.email || null,
          address: q.customer?.address || null,
          created_by: salespersonId,
        }).select('id').single()

        if (cErr) {
          console.error("Failed to create customer:", cErr)
        }
        customerUuid = newCust?.id
      }
    }

    if (!customerUuid) {
      return { success: false, error: "Could not resolve customer in Supabase" }
    }

    // 3. Map status to valid database enum
    let dbStatus = q.status || 'Draft'
    if (dbStatus === 'Approved') {
      dbStatus = 'Admin Accepted'
    }

    const subtotal = Number(q.subtotal) || Number(q.grandTotal) || 0
    const grandTotal = Number(q.grandTotal) || 0
    const discountSarAmount = Number(q.discount_total) || 0
    const vatAmount = Number(q.vat_amount) || (grandTotal - (grandTotal / 1.15))
    const netAmount = Number(q.netAmount) || (grandTotal / 1.15)

    // 4. Insert into quotations table
    const { data: insertedQuotation, error: qErr } = await supabase.from('quotations').insert({
      customer_id: customerUuid,
      salesperson_id: salespersonId,
      status: dbStatus,
      subtotal: subtotal,
      discount_total: discountSarAmount,
      net_amount: netAmount,
      vat_rate: 15.00,
      vat_amount: vatAmount,
      grand_total: grandTotal,
      payment_terms: q.paymentTerms || null,
      delivery_terms: q.deliveryTerms || null,
      remarks: q.remarks || null,
    }).select('id, quotation_number').single()

    if (qErr) {
      console.error("Error inserting quotation to Supabase:", qErr)
      return { success: false, error: qErr.message }
    }

    // 5. Insert quotation items if present
    if (insertedQuotation && q.items && Array.isArray(q.items) && q.items.length > 0) {
      for (const item of q.items) {
        try {
          const product = item.product || {}
          const color = (item.color || product.variants?.[0]?.color || 'WHITE').toUpperCase()
          const unitPrice = Number(item.unitPrice) || Number(item.unit_price_snapshot) || Number(product.price_bw) || 0
          const qty = Number(item.qty) || Number(item.quantity) || 1
          const discountPct = Number(item.discount) || Number(item.discount_percentage) || 0
          const discountAmt = unitPrice * qty * (discountPct / 100)
          const lineAmount = Number(item.line_amount) || (unitPrice * qty - discountAmt)

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

              variantId = dbVariant?.id || null
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
        } catch (itemErr) {
          console.error("Error inserting quotation item:", itemErr)
        }
      }
    }

    // 6. Insert discount approval if pending
    const maxDiscountPct = Number(q.discount) || 0
    if (dbStatus === 'Pending Approval' || maxDiscountPct > 25) {
      await supabase.from('discount_approvals').insert({
        quotation_id: insertedQuotation.id,
        status: 'Pending',
      })
    }

    return { 
      success: true, 
      id: insertedQuotation.id, 
      quotationNumber: insertedQuotation.quotation_number 
    }
  } catch (err: any) {
    console.error("saveQuotationToDB caught error:", err)
    return { success: false, error: err.message }
  }
}
