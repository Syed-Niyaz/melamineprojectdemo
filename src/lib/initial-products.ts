export type ProductVariant = {
  id?: string
  color: string
  stock: number
  sales?: number
  image_url?: string
}

export type Product = {
  id: string
  name_en: string
  name_ar: string
  sku: string
  category: string
  price_bw: number
  price_colored: number
  image_color: string
  base_image_url: string
  image_url: string
  expected?: string
  variants: ProductVariant[]
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name_en: 'Cup & Saucer Set',
    name_ar: 'فنجان وصحن',
    sku: 'CS-150',
    category: 'Accessories',
    price_bw: 14,
    price_colored: 16.10,
    image_color: 'bg-stone-100',
    base_image_url: '/images/cup_saucer',
    image_url: '/images/cup_saucer.png',
    variants: [
      { color: 'WHITE', stock: 45, sales: 120 },
      { color: 'BLACK', stock: 12, sales: 50 },
      { color: 'GOLDEN MARBLA', stock: 8, sales: 15 },
      { color: 'WHITE MARBLE', stock: 24, sales: 42 },
      { color: 'CREAM DOT', stock: 30, sales: 85 },
      { color: 'BLACK MARBLE', stock: 5, sales: 10 },
      { color: 'GRAY 1200', stock: 15, sales: 25 },
    ]
  },
  {
    id: '2',
    name_en: 'Deep Plate 9"',
    name_ar: 'طبق عميق 9 بوصة',
    sku: 'DP-090',
    category: 'Dinner Plates',
    price_bw: 10,
    price_colored: 11.50,
    image_color: 'bg-[#F2EDE4]',
    base_image_url: '/images/plate_white',
    image_url: '/images/plate_white.png',
    variants: [
      { color: 'WHITE', stock: 50, sales: 210 },
      { color: 'BLACK', stock: 5, sales: 80 },
      { color: 'GOLDEN MARBLA', stock: 12, sales: 30 },
      { color: 'WHITE MARBLE', stock: 18, sales: 65 },
      { color: 'CREAM DOT', stock: 40, sales: 150 },
      { color: 'BLACK MARBLE', stock: 2, sales: 15 },
      { color: 'GRAY 1200', stock: 11, sales: 40 },
    ]
  },
  {
    id: '3',
    name_en: 'Dinner Plate 11"',
    name_ar: 'طبق عشاء 11 بوصة',
    sku: 'DP-110',
    category: 'Dinner Plates',
    price_bw: 12.5,
    price_colored: 14.37,
    image_color: 'bg-zinc-800',
    base_image_url: '/images/plate_black',
    image_url: '/images/plate_black.png',
    variants: [
      { color: 'WHITE', stock: 10, sales: 180 },
      { color: 'BLACK', stock: 20, sales: 120 },
      { color: 'GOLDEN MARBLA', stock: 35, sales: 45 },
      { color: 'WHITE MARBLE', stock: 8, sales: 70 },
      { color: 'CREAM DOT', stock: 22, sales: 110 },
      { color: 'BLACK MARBLE', stock: 14, sales: 20 },
      { color: 'GRAY 1200', stock: 50, sales: 55 },
    ]
  },
  {
    id: '4',
    name_en: 'Dinner Set Black',
    name_ar: 'طقم عشاء',
    sku: 'DNS-510',
    category: 'Accessories',
    price_bw: 95,
    price_colored: 109.25,
    image_color: 'bg-zinc-900',
    base_image_url: '/images/dinner_set_black',
    image_url: '/images/dinner_set_black.png',
    variants: [
      { color: 'WHITE', stock: 0, sales: 45 },
      { color: 'BLACK', stock: 18, sales: 85 },
      { color: 'GOLDEN MARBLA', stock: 2, sales: 10 },
      { color: 'WHITE MARBLE', stock: 5, sales: 25 },
      { color: 'CREAM DOT', stock: 12, sales: 30 },
      { color: 'BLACK MARBLE', stock: 8, sales: 15 },
      { color: 'GRAY 1200', stock: 20, sales: 40 },
    ]
  },
  {
    id: '5',
    name_en: 'Leaf Platter 12"',
    name_ar: 'طبق ورقة 12 بوصة',
    sku: 'LP-360',
    category: 'Platters',
    price_bw: 32,
    price_colored: 36.80,
    expected: '20 Aug 2026',
    image_color: 'bg-green-50',
    base_image_url: '/images/serving_platter',
    image_url: '/images/serving_platter.png',
    variants: [
      { color: 'WHITE', stock: 5, sales: 65 },
      { color: 'BLACK', stock: 0, sales: 30 },
      { color: 'GOLDEN MARBLA', stock: 2, sales: 5 },
      { color: 'WHITE MARBLE', stock: 1, sales: 15 },
      { color: 'CREAM DOT', stock: 8, sales: 40 },
      { color: 'BLACK MARBLE', stock: 0, sales: 8 },
      { color: 'GRAY 1200', stock: 4, sales: 12 },
    ]
  },
  {
    id: '6',
    name_en: 'Soup Bowl',
    name_ar: 'طبق شوربة',
    sku: 'SB-200',
    category: 'Bowls',
    price_bw: 8.5,
    price_colored: 9.77,
    image_color: 'bg-amber-50',
    base_image_url: '/images/soup_bowl',
    image_url: '/images/soup_bowl.png',
    variants: [
      { color: 'WHITE', stock: 60, sales: 250 },
      { color: 'BLACK', stock: 45, sales: 110 },
      { color: 'GOLDEN MARBLA', stock: 20, sales: 40 },
      { color: 'WHITE MARBLE', stock: 35, sales: 85 },
      { color: 'CREAM DOT', stock: 55, sales: 190 },
      { color: 'BLACK MARBLE', stock: 12, sales: 25 },
      { color: 'GRAY 1200', stock: 30, sales: 60 },
    ]
  }
]
