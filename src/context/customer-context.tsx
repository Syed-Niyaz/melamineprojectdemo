'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Customer = {
  id: string
  name: string
  nameAr?: string
  contact_person: string
  mobile_no: string
  email: string
  address?: string
  vat_no?: string
  cr_no?: string
  vat?: string
  cr?: string
  notes?: string
  orders: number
}

const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Al Muhaidib Kitchens', contact_person: 'Khalid Al Muhaidib', mobile_no: '+966 13 812 3456', email: 'khalid@almuhaidib.com.sa', address: 'King Fahd Road, Al Khobar 31952', vat_no: '310123456700003', cr_no: '1010123456789', orders: 12 },
  { id: '2', name: 'Raha Kitchen Solutions', contact_person: 'Faisal Al Ghamdi', mobile_no: '+966 13 823 4567', email: 'faisal@raha-kitchens.sa', address: 'Dhahran St, Dammam', orders: 4 },
  { id: '3', name: 'Eastern Kitchens Factory', contact_person: 'Omar Al Dossari', mobile_no: '+966 13 834 5678', email: 'omar@eastern-kitchens.sa', address: 'Industrial Area, Jubail', orders: 8 },
  { id: '4', name: 'Gulf Modular Kitchens', contact_person: 'Sultan Al Harbi', mobile_no: '+966 13 845 6789', email: 'sultan@gulfmodular.sa', address: 'Prince Faisal St, Riyadh', orders: 3 },
  { id: '5', name: 'Al Jazeera Kitchen World', contact_person: 'Mohammed Al Qahtani', mobile_no: '+966 13 856 7890', email: 'mohammed@aljazeerakitchen.sa', address: 'Olaya District, Riyadh', orders: 6 },
]

type CustomerContextType = {
  customers: Customer[]
  addCustomer: (c: Customer) => Promise<void>
  updateCustomer: (c: Customer) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  refreshCustomers: () => Promise<void>
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch customers from server persistent store (/api/customers)
  const fetchCustomersFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        if (data?.customers && Array.isArray(data.customers) && data.customers.length > 0) {
          setCustomers(data.customers)
          try {
            localStorage.setItem('global_customers', JSON.stringify(data.customers))
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error fetching customers from server API:', err)
    }
  }, [])

  const fetchCustomersFromSupabase = useCallback(async () => {
    await fetchCustomersFromServer()

    const supabase = createClient()
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (data && !error && data.length > 0) {
        const formatted: Customer[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          contact_person: c.name,
          mobile_no: c.mobile_no || '',
          email: c.email || '',
          address: c.address || '',
          vat_no: c.vat_no || '',
          cr_no: c.cr_no || '',
          orders: 0,
        }))

        // Merge with local/server items
        let merged = formatted
        try {
          const currentLocal = JSON.parse(localStorage.getItem('global_customers') || '[]')
          if (Array.isArray(currentLocal) && currentLocal.length > 0) {
            const extraLocal = currentLocal.filter((lc: Customer) =>
              !formatted.some(fc => fc.id === lc.id || fc.name.toLowerCase() === lc.name.toLowerCase())
            )
            merged = [...formatted, ...extraLocal]
          }
        } catch {}

        setCustomers(merged)
        try {
          localStorage.setItem('global_customers', JSON.stringify(merged))
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching customers from Supabase:', err)
    }
  }, [fetchCustomersFromServer])

  useEffect(() => {
    // 1. Initial local cache load for instantaneous UI rendering
    try {
      const stored = localStorage.getItem('global_customers')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomers(parsed)
        }
      }
    } catch {}
    setIsLoaded(true)

    // 2. Fetch live from server
    fetchCustomersFromServer()

    // 3. Poll server every 3 seconds so both devices stay synchronized
    const pollInterval = setInterval(() => {
      fetchCustomersFromServer()
    }, 3000)

    // 4. Focus sync
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchCustomersFromServer()
      }
    }
    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    // 5. Cross-tab sync
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('global_customers')
        if (saved) {
          setCustomers(JSON.parse(saved))
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
  }, [fetchCustomersFromServer])

  const addCustomer = async (c: Customer) => {
    const tempId = c.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString())
    const tempCustomer: Customer = { ...c, id: tempId }

    setCustomers(prev => {
      const updated = [tempCustomer, ...prev.filter(existing => existing.id !== tempId)]
      try {
        localStorage.setItem('global_customers', JSON.stringify(updated))
      } catch {}
      return updated
    })

    // Save to server API (/api/customers)
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', customer: tempCustomer }),
      })
    } catch (e) {
      console.error('Failed to save customer to server API:', e)
    }

    // Best-effort Supabase sync
    const supabase = createClient()
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('customers').insert({
            name: c.name,
            address: c.address,
            mobile_no: c.mobile_no,
            email: c.email,
            vat_no: c.vat_no || c.vat,
            cr_no: c.cr_no || c.cr,
            created_by: user.id,
          })
        }
      } catch {}
    }
  }

  const updateCustomer = async (c: Customer) => {
    setCustomers(prev => {
      const updated = prev.map(existing => existing.id === c.id ? c : existing)
      try {
        localStorage.setItem('global_customers', JSON.stringify(updated))
      } catch {}
      return updated
    })

    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', customer: c }),
      })
    } catch (e) {
      console.error('Failed to update customer on server API:', e)
    }

    const supabase = createClient()
    if (supabase) {
      try {
        await supabase.from('customers').update({
          name: c.name,
          address: c.address,
          mobile_no: c.mobile_no,
          email: c.email,
          vat_no: c.vat_no || c.vat,
          cr_no: c.cr_no || c.cr,
        }).eq('id', c.id)
      } catch {}
    }
  }

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => {
      const updated = prev.filter(c => c.id !== id)
      try {
        localStorage.setItem('global_customers', JSON.stringify(updated))
      } catch {}
      return updated
    })

    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
    } catch (e) {
      console.error('Failed to delete customer on server API:', e)
    }

    const supabase = createClient()
    if (supabase) {
      try {
        await supabase.from('customers').delete().eq('id', id)
      } catch {}
    }
  }

  return (
    <CustomerContext.Provider
      value={{
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        refreshCustomers: fetchCustomersFromSupabase,
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomers() {
  const context = useContext(CustomerContext)
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider')
  }
  return context
}
