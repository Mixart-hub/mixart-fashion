import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const adminHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mixart.fashion' },
    create: { name: 'Admin', email: 'admin@mixart.fashion', passwordHash: adminHash, role: 'ADMIN' },
    update: {}
  })
  console.log('Admin created:', admin.email)

  // Branches
  const tashkent = await prisma.branch.upsert({
    where: { id: 'branch-tashkent' },
    create: {
      id: 'branch-tashkent',
      name: 'Toshkent', nameUz: 'Toshkent Filiali', nameRu: 'Ташкент', nameEn: 'Tashkent',
      city: 'Toshkent', address: "Chilonzor tumani, Bunyodkor ko'chasi, 47",
      phone: '+998901234567', lat: 41.2995, lng: 69.2401
    },
    update: {}
  })
  const samarkand = await prisma.branch.upsert({
    where: { id: 'branch-samarkand' },
    create: {
      id: 'branch-samarkand',
      name: 'Samarqand', nameUz: 'Samarqand Filiali', nameRu: 'Самарканд', nameEn: 'Samarkand',
      city: 'Samarqand', address: "Registon ko'chasi, 15",
      phone: '+998901234568', lat: 39.6547, lng: 66.9758
    },
    update: {}
  })
  await prisma.branch.upsert({
    where: { id: 'branch-bukhara' },
    create: {
      id: 'branch-bukhara',
      name: 'Buxoro', nameUz: 'Buxoro Filiali', nameRu: 'Бухара', nameEn: 'Bukhara',
      city: 'Buxoro', address: "Mustaqillik ko'chasi, 8",
      phone: '+998901234569', lat: 39.7747, lng: 64.4286
    },
    update: {}
  })
  console.log('Branches created')

  // Categories
  const womens = await prisma.category.upsert({
    where: { slug: 'womens' },
    create: { name: "Ayollar", nameUz: "Ayollar kiyimi", nameRu: "Женская одежда", nameEn: "Women's", slug: 'womens', sortOrder: 1 },
    update: {}
  })
  const mens = await prisma.category.upsert({
    where: { slug: 'mens' },
    create: { name: "Erkaklar", nameUz: "Erkaklar kiyimi", nameRu: "Мужская одежда", nameEn: "Men's", slug: 'mens', sortOrder: 2 },
    update: {}
  })
  await prisma.category.upsert({
    where: { slug: 'accessories' },
    create: { name: "Aksessuarlar", nameUz: "Aksessuarlar", nameRu: "Аксессуары", nameEn: "Accessories", slug: 'accessories', sortOrder: 3 },
    update: {}
  })
  console.log('Categories created')

  // Sample products
  const products = [
    {
      name: 'Yozgi ko\'ylak', nameUz: 'Yozgi ko\'ylak', nameRu: 'Летнее платье', nameEn: 'Summer Dress',
      price: 280000, comparePrice: 350000, stock: 50,
      sizes: ['S', 'M', 'L', 'XL'], colors: ['Oq', 'Qizil', 'Ko\'k'],
      images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600'],
      categoryId: womens.id, isFeatured: true,
      descUz: "Yozgi mavsumga mos, yengil va nafis ko'ylak",
      descRu: "Легкое и изящное летнее платье",
      descEn: "Light and elegant summer dress"
    },
    {
      name: 'Klassik ko\'ylak', nameUz: 'Klassik ko\'ylak', nameRu: 'Классическая рубашка', nameEn: 'Classic Shirt',
      price: 180000, stock: 80,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Oq', 'Kulrang', 'Ko\'k'],
      images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600'],
      categoryId: mens.id, isFeatured: true,
      descUz: "Har kuni kiyish uchun klassik ko'ylak",
      descRu: "Классическая рубашка для ежедневной носки",
      descEn: "Classic shirt for everyday wear"
    },
    {
      name: 'Elegante Bluz', nameUz: 'Elegante Bluz', nameRu: 'Элегантная блузка', nameEn: 'Elegant Blouse',
      price: 220000, comparePrice: 280000, stock: 35,
      sizes: ['XS', 'S', 'M', 'L'], colors: ['Qora', 'Oq', 'Jigarrang'],
      images: ['https://images.unsplash.com/photo-1485231183945-fffde7c73cd6?w=600'],
      categoryId: womens.id, isFeatured: true,
      descUz: "Zamonaviy elegante bluz",
      descRu: "Современная элегантная блузка",
      descEn: "Modern elegant blouse"
    },
    {
      name: 'Sport Kostum', nameUz: 'Sport Kostum', nameRu: 'Спортивный костюм', nameEn: 'Sport Suit',
      price: 450000, stock: 25,
      sizes: ['S', 'M', 'L', 'XL'], colors: ['Qora', 'Kulrang', 'Yashil'],
      images: ['https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600'],
      categoryId: mens.id,
      descUz: "Qulay sport kostum",
      descRu: "Удобный спортивный костюм",
      descEn: "Comfortable sport suit"
    },
  ]

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: `SKU-${p.name.replace(/\s/g, '-')}` },
      create: { ...p, sku: `SKU-${p.name.replace(/\s/g, '-')}` },
      update: {}
    })
    // Add inventory
    await prisma.inventory.upsert({
      where: { productId_branchId: { productId: product.id, branchId: tashkent.id } },
      create: { productId: product.id, branchId: tashkent.id, quantity: Math.floor(p.stock * 0.6) },
      update: {}
    })
    await prisma.inventory.upsert({
      where: { productId_branchId: { productId: product.id, branchId: samarkand.id } },
      create: { productId: product.id, branchId: samarkand.id, quantity: Math.floor(p.stock * 0.3) },
      update: {}
    })
  }
  console.log('Products and inventory seeded')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
