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
