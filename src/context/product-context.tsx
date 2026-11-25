'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INITIAL_PRODUCTS, Product, ProductVariant } from '@/lib/initial-products'

export type { Product, ProductVariant }

type ProductContextType = {
  products: Product[]
  deductStock: (productId: string, color: string, qty: number) => Promise<void>
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  refreshProducts: () => Promise<void>
  addProduct: (product: Product) => Promise<void>
  updateProduct: (product: Product) => Promise<void>
  deleteProduct: (productId: string) => Promise<void>
  addVariant: (productId: string, variant: ProductVariant) => Promise<void>
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch products from server-side persistent store (/api/products)
  const fetchProductsFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        if (data?.products && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products)
          try {
            localStorage.setItem('global_products_v2', JSON.stringify(data.products))
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error fetching products from server API:', err)
    }
  }, [])

  // Live Supabase fetch fallback (if Supabase is configured and reachable)
  const fetchProductsFromSupabase = useCallback(async () => {
    // First, sync from server API
    await fetchProductsFromServer()

    const supabase = createClient()
    if (!supabase) return

    try {
      let { data: dbProducts, error } = await supabase
        .from('products')
        .select(`
          id,
          item_no,
          description,
          arabic_description,
          category,
          unit_price,
          image_url,
          product_variants (
            id,
            color,
            stock_quantity,
            image_url
          )
        `)

      if (error) {
        const fallbackRes = await supabase
          .from('products')
          .select(`
            id,
            item_no,
            description,
            arabic_description,
            category,
            unit_price,
            image_url,
            product_variants (
              id,
              color,
              stock_quantity
            )
          `)
        dbProducts = fallbackRes.data
        error = fallbackRes.error
      }

      if (dbProducts && !error && dbProducts.length > 0) {
        const formatted: Product[] = dbProducts.map((p: any) => {
          const initMatch = INITIAL_PRODUCTS.find(ip => ip.sku === p.item_no || ip.name_en === p.description)
          return {
            id: p.id,
            sku: p.item_no,
            name_en: p.description,
            name_ar: p.arabic_description || p.description,
            category: p.category || 'General',
            price_bw: Number(p.unit_price) || 10,
            price_colored: Number((Number(p.unit_price) * 1.15).toFixed(2)),
            image_color: initMatch?.image_color || 'bg-slate-100',
            base_image_url: initMatch?.base_image_url || '/images/cup_saucer',
            image_url: p.image_url || initMatch?.image_url || '/images/cup_saucer.png',
            variants: p.product_variants && p.product_variants.length > 0
              ? p.product_variants.map((v: any) => ({
                  id: v.id,
                  color: v.color,
                  stock: v.stock_quantity,
                  sales: 25,
                  image_url: v.image_url || undefined,
                }))
              : (initMatch?.variants || [
                  { color: 'WHITE', stock: 50, sales: 20 },
                  { color: 'BLACK', stock: 30, sales: 15 },
                ])
          }
        })

        // Merge with server/local custom products
        let merged = formatted
        try {
          const currentLocal = JSON.parse(localStorage.getItem('global_products_v2') || '[]')
          if (Array.isArray(currentLocal) && currentLocal.length > 0) {
            const extraLocal = currentLocal.filter((lp: Product) =>
              !formatted.some(fp => fp.id === lp.id || fp.sku === lp.sku)
            )
            merged = [...formatted, ...extraLocal]
          }
        } catch {}

        setProducts(merged)
        try {
          localStorage.setItem('global_products_v2', JSON.stringify(merged))
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching products from Supabase:', err)
    }
  }, [fetchProductsFromServer])

  useEffect(() => {
    // 1. Initial local cache load for instantaneous UI rendering
    try {
      const saved = localStorage.getItem('global_products_v2') || localStorage.getItem('global_products_v1')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed)
        }
      }
    } catch {}
    setIsLoaded(true)

    // 2. Fetch fresh products from server
    fetchProductsFromServer()

    // 3. Poll server every 3 seconds so different devices (Admin PC vs Salesperson Laptop) stay in sync!
    const pollInterval = setInterval(() => {
      fetchProductsFromServer()
    }, 3000)

    // 4. Sync immediately when window is refocused or visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchProductsFromServer()
      }
    }
    window.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    // 5. Cross-tab sync in same browser
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('global_products_v2')
        if (saved) {
          setProducts(JSON.parse(saved))
        }
      } catch {}
    }
    window.addEventListener('storage', handleSync)
    window.addEventListener('stock_updated', handleSync)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('stock_updated', handleSync)
    }
  }, [fetchProductsFromServer])

  // Add a new product (updates state, localStorage, and saves to server persistent JSON)
  const addProduct = async (product: Product) => {
    setProducts(prev => {
      const exists = prev.some(p => p.id === product.id || (product.sku && p.sku === product.sku))
      const updated = exists ? prev.map(p => (p.id === product.id || p.sku === product.sku) ? product : p) : [product, ...prev]
      try {
        localStorage.setItem('global_products_v2', JSON.stringify(updated))
        setTimeout(() => window.dispatchEvent(new Event('stock_updated')), 50)
      } catch {}
      return updated
    })

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', product }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.products) {
          setProducts(data.products)
          try {
            localStorage.setItem('global_products_v2', JSON.stringify(data.products))
          } catch {}
        }
      }
    } catch (e) {
      console.error('Failed to save product to server API:', e)
    }
  }

  // Update product details
  const updateProduct = async (product: Product) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === product.id ? product : p)
      try {
        localStorage.setItem('global_products_v2', JSON.stringify(updated))
        setTimeout(() => window.dispatchEvent(new Event('stock_updated')), 50)
      } catch {}
      return updated
    })

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', product }),
      })
    } catch (e) {
      console.error('Failed to update product on server API:', e)
    }
  }

  // Delete product
  const deleteProduct = async (productId: string) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== productId)
      try {
        localStorage.setItem('global_products_v2', JSON.stringify(updated))
        setTimeout(() => window.dispatchEvent(new Event('stock_updated')), 50)
      } catch {}
      return updated
    })

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: productId }),
      })
    } catch (e) {
      console.error('Failed to delete product on server API:', e)
    }
  }

  // Add variant to product
  const addVariant = async (productId: string, variant: ProductVariant) => {
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id !== productId) return p
        return {
          ...p,
          variants: [...p.variants.filter(v => v.color.toLowerCase() !== variant.color.toLowerCase()), variant],
        }
      })
      try {
        localStorage.setItem('global_products_v2', JSON.stringify(updated))
        setTimeout(() => window.dispatchEvent(new Event('stock_updated')), 50)
      } catch {}
      return updated
    })

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addVariant', productId, variant }),
      })
    } catch (e) {
      console.error('Failed to add variant on server API:', e)
    }
  }

  // Deduct stock
  const deductStock = async (productId: string, color: string, qty: number) => {
    setProducts(prevProducts => {
      const updated = prevProducts.map(p => {
        const isProductMatch = String(p.id).toLowerCase() === String(productId).toLowerCase() ||
                               String(p.sku).toLowerCase() === String(productId).toLowerCase() ||
                               String(p.name_en).toLowerCase() === String(productId).toLowerCase()
        if (!isProductMatch) return p
        return {
          ...p,
          variants: p.variants.map(v => {
            const isColorMatch = String(v.color).trim().toUpperCase() === String(color).trim().toUpperCase()
            if (!isColorMatch) return v
            const newStock = Math.max(0, v.stock - Number(qty))
            return {
              ...v,
              stock: newStock,
              sales: (v.sales || 0) + Number(qty)
            }
          })
        }
      })
      try {
        localStorage.setItem('global_products_v2', JSON.stringify(updated))
        setTimeout(() => window.dispatchEvent(new Event('stock_updated')), 50)
      } catch {}
      return updated
    })

    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deductStock', productId, color, qty }),
      })
    } catch (e) {
      console.error('Failed to deduct stock on server API:', e)
    }
  }

  return (
    <ProductContext.Provider value={{
      products,
      deductStock,
      setProducts,
      refreshProducts: fetchProductsFromSupabase,
      addProduct,
      updateProduct,
      deleteProduct,
      addVariant,
    }}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductContext)
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider')
  }
  return context
}
