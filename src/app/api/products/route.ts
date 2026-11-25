import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { INITIAL_PRODUCTS, Product, ProductVariant } from '@/lib/initial-products'

const DATA_DIR = path.join(process.cwd(), 'data')
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json')

function getStoredProducts(): Product[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(INITIAL_PRODUCTS, null, 2), 'utf-8')
      return INITIAL_PRODUCTS
    }
    const content = fs.readFileSync(PRODUCTS_FILE, 'utf-8')
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return INITIAL_PRODUCTS
  } catch (err) {
    console.error('Error reading products.json:', err)
    return INITIAL_PRODUCTS
  }
}

function saveStoredProducts(products: Product[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error saving products.json:', err)
    return false
  }
}

// GET /api/products
export async function GET() {
  const products = getStoredProducts()
  return NextResponse.json({ products })
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'add', product, productId, variant, color, qty, id, products: batchProducts } = body
    let current = getStoredProducts()

    if (action === 'add' && product) {
      if (!product.id) {
        product.id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
      }
      // Avoid duplicate by sku or id
      const existsIndex = current.findIndex(p => (product.id && p.id === product.id) || (product.sku && p.sku === product.sku))
      if (existsIndex >= 0) {
        current[existsIndex] = { ...current[existsIndex], ...product }
      } else {
        current = [product, ...current]
      }
    } else if (action === 'update' && product) {
      current = current.map(p => p.id === product.id ? { ...p, ...product } : p)
    } else if (action === 'addVariant' && productId && variant) {
      current = current.map(p => {
        if (p.id !== productId) return p
        const hasColor = p.variants.some(v => v.color.toLowerCase() === variant.color.toLowerCase())
        if (hasColor) {
          return {
            ...p,
            variants: p.variants.map(v => v.color.toLowerCase() === variant.color.toLowerCase() ? { ...v, ...variant } : v)
          }
        }
        return {
          ...p,
          variants: [...p.variants, variant]
        }
      })
    } else if (action === 'updateVariant' && productId && color) {
      current = current.map(p => {
        if (p.id !== productId) return p
        return {
          ...p,
          variants: p.variants.map(v => v.color.toLowerCase() === color.toLowerCase() ? { ...v, stock: Number(qty) || 0 } : v)
        }
      })
    } else if (action === 'deductStock' && productId && color) {
      current = current.map(p => {
        const isMatch = String(p.id).toLowerCase() === String(productId).toLowerCase() ||
                        String(p.sku).toLowerCase() === String(productId).toLowerCase() ||
                        String(p.name_en).toLowerCase() === String(productId).toLowerCase()
        if (!isMatch) return p
        return {
          ...p,
          variants: p.variants.map(v => {
            if (v.color.trim().toUpperCase() !== String(color).trim().toUpperCase()) return v
            const newStock = Math.max(0, v.stock - Number(qty))
            return {
              ...v,
              stock: newStock,
              sales: (v.sales || 0) + Number(qty)
            }
          })
        }
      })
    } else if (action === 'delete' && id) {
      current = current.filter(p => p.id !== id)
    } else if (action === 'sync' && Array.isArray(batchProducts)) {
      // Merge batch products preserving custom items
      const mergedMap = new Map<string, Product>()
      current.forEach(p => mergedMap.set(p.id, p))
      batchProducts.forEach((p: Product) => mergedMap.set(p.id, p))
      current = Array.from(mergedMap.values())
    } else if (product) {
      // Fallback: direct product add
      current = [product, ...current.filter(p => p.id !== product.id)]
    }

    saveStoredProducts(current)

    return NextResponse.json({ success: true, products: current })
  } catch (err: any) {
    console.error('API products error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
