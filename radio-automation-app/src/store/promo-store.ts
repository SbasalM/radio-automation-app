import { create } from 'zustand'
import type { PromoFile, PromoCategory } from '@/types/audio'

interface PromoStore {
  // State
  promos: PromoFile[]
  categories: PromoCategory[]
  isLoading: boolean
  
  // Actions
  addPromo: (promo: Omit<PromoFile, 'id' | 'createdAt' | 'updatedAt'>) => PromoFile
  updatePromo: (id: string, updates: Partial<PromoFile>) => void
  deletePromo: (id: string) => void
  getPromo: (id: string) => PromoFile | undefined
  getPromosByCategory: (categoryId: string) => PromoFile[]
  getPromosByShow: (showId: string) => PromoFile[]
  getPromosByTimeSlot: (timeSlot: string) => PromoFile[]
  
  // Category actions
  addCategory: (category: Omit<PromoCategory, 'id' | 'createdAt' | 'updatedAt'>) => PromoCategory
  updateCategory: (id: string, updates: Partial<PromoCategory>) => void
  deleteCategory: (id: string) => void
  getCategory: (id: string) => PromoCategory | undefined
  
  // Utility actions
  searchPromos: (query: string) => PromoFile[]
  getPromoStats: () => { total: number; byCategory: Record<string, number>; byTimeSlot: Record<string, number> }
  initializeDefaultData: () => void
}

const createMockPromos = (): PromoFile[] => [
  {
    id: 'promo-1',
    name: 'Morning Drive Time',
    filename: 'morning-drive.mp3',
    duration: 15,
    categories: ['morning'],
    shows: ['show-1'],
    timeSlots: ['morning'],
    playCount: 45,
    lastPlayed: new Date(Date.now() - 86400000), // Yesterday
    filePath: '/promos/morning-drive.mp3',
    audioFile: {
      id: 'audio-promo-1',
      filename: 'morning-drive.mp3',
      duration: 15,
      sampleRate: 44100,
      channels: 2,
      format: 'mp3',
      bitRate: 128,
      fileSize: 240000, // ~240KB
      filePath: '/promos/morning-drive.mp3',
      createdAt: new Date(),
      lastModified: new Date()
    },
    createdAt: new Date(Date.now() - 7 * 86400000), // 1 week ago
    updatedAt: new Date()
  },
  {
    id: 'promo-2',
    name: 'Afternoon Update',
    filename: 'afternoon-update.mp3',
    duration: 20,
    categories: ['afternoon'],
    shows: ['show-2', 'show-3'],
    timeSlots: ['afternoon'],
    playCount: 32,
    lastPlayed: new Date(Date.now() - 43200000), // 12 hours ago
    filePath: '/promos/afternoon-update.mp3',
    audioFile: {
      id: 'audio-promo-2',
      filename: 'afternoon-update.mp3',
      duration: 20,
      sampleRate: 44100,
      channels: 2,
      format: 'mp3',
      bitRate: 192,
      fileSize: 480000, // ~480KB
      filePath: '/promos/afternoon-update.mp3',
      createdAt: new Date(),
      lastModified: new Date()
    },
    createdAt: new Date(Date.now() - 5 * 86400000), // 5 days ago
    updatedAt: new Date()
  },
  {
    id: 'promo-3',
    name: 'Weekend Special',
    filename: 'weekend-special.wav',
    duration: 25,
    categories: ['weekend', 'special'],
    shows: ['show-4'],
    timeSlots: ['weekend'],
    playCount: 18,
    lastPlayed: new Date(Date.now() - 259200000), // 3 days ago
    filePath: '/promos/weekend-special.wav',
    audioFile: {
      id: 'audio-promo-3',
      filename: 'weekend-special.wav',
      duration: 25,
      sampleRate: 48000,
      channels: 2,
      format: 'wav',
      fileSize: 2400000, // ~2.4MB
      filePath: '/promos/weekend-special.wav',
      createdAt: new Date(),
      lastModified: new Date()
    },
    createdAt: new Date(Date.now() - 14 * 86400000), // 2 weeks ago
    updatedAt: new Date()
  },
  {
    id: 'promo-4',
    name: 'Evening Jazz Hour',
    filename: 'evening-jazz.mp3',
    duration: 18,
    categories: ['evening'],
    shows: ['show-5'],
    timeSlots: ['evening'],
    playCount: 67,
    lastPlayed: new Date(Date.now() - 3600000), // 1 hour ago
    filePath: '/promos/evening-jazz.mp3',
    audioFile: {
      id: 'audio-promo-4',
      filename: 'evening-jazz.mp3',
      duration: 18,
      sampleRate: 44100,
      channels: 2,
      format: 'mp3',
      bitRate: 160,
      fileSize: 360000, // ~360KB
      filePath: '/promos/evening-jazz.mp3',
      createdAt: new Date(),
      lastModified: new Date()
    },
    createdAt: new Date(Date.now() - 21 * 86400000), // 3 weeks ago
    updatedAt: new Date()
  },
  {
    id: 'promo-5',
    name: 'Sports Update',
    filename: 'sports-update.mp3',
    duration: 12,
    categories: ['sports', 'news'],
    shows: ['show-6'],
    timeSlots: ['morning', 'afternoon', 'evening'],
    playCount: 89,
    lastPlayed: new Date(Date.now() - 7200000), // 2 hours ago
    filePath: '/promos/sports-update.mp3',
    audioFile: {
      id: 'audio-promo-5',
      filename: 'sports-update.mp3',
      duration: 12,
      sampleRate: 44100,
      channels: 1, // Mono for sports updates
      format: 'mp3',
      bitRate: 128,
      fileSize: 192000, // ~192KB
      filePath: '/promos/sports-update.mp3',
      createdAt: new Date(),
      lastModified: new Date()
    },
    createdAt: new Date(Date.now() - 10 * 86400000), // 10 days ago
    updatedAt: new Date()
  }
]

const createMockCategories = (): PromoCategory[] => [
  {
    id: 'morning',
    name: 'Morning Drive',
    description: 'Promos for morning drive time (6-10 AM)',
    timeSlots: ['morning'],
    priority: 'high',
    color: '#f59e0b', // Amber
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'afternoon',
    name: 'Afternoon Block',
    description: 'Afternoon programming promos (12-6 PM)',
    timeSlots: ['afternoon'],
    priority: 'medium',
    color: '#3b82f6', // Blue
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'evening',
    name: 'Evening Shows',
    description: 'Evening and prime time content (6-11 PM)',
    timeSlots: ['evening'],
    priority: 'medium',
    color: '#8b5cf6', // Purple
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'weekend',
    name: 'Weekend Programming',
    description: 'Weekend-specific content and specials',
    timeSlots: ['weekend'],
    priority: 'medium',
    color: '#10b981', // Emerald
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'special',
    name: 'Special Events',
    description: 'Special event and holiday programming',
    timeSlots: ['morning', 'afternoon', 'evening', 'weekend'],
    priority: 'high',
    color: '#ef4444', // Red
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sports',
    name: 'Sports Content',
    description: 'Sports updates and programming',
    timeSlots: ['morning', 'afternoon', 'evening'],
    priority: 'medium',
    color: '#f97316', // Orange
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'news',
    name: 'News Updates',
    description: 'News and information programming',
    timeSlots: ['morning', 'afternoon', 'evening'],
    priority: 'high',
    color: '#06b6d4', // Cyan
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export const usePromoStore = create<PromoStore>((set, get) => ({
  // Initial state
  promos: [],
  categories: [],
  isLoading: false,

  // Promo actions
  addPromo: (promoData) => {
    const newPromo: PromoFile = {
      ...promoData,
      id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    set(state => ({
      promos: [...state.promos, newPromo]
    }))
    
    return newPromo
  },

  updatePromo: (id, updates) => {
    set(state => ({
      promos: state.promos.map(promo =>
        promo.id === id 
          ? { ...promo, ...updates, updatedAt: new Date() }
          : promo
      )
    }))
  },

  deletePromo: (id) => {
    set(state => ({
      promos: state.promos.filter(promo => promo.id !== id)
    }))
  },

  getPromo: (id) => {
    return get().promos.find(promo => promo.id === id)
  },

  getPromosByCategory: (categoryId) => {
    return get().promos.filter(promo => promo.categories.includes(categoryId))
  },

  getPromosByShow: (showId) => {
    return get().promos.filter(promo => promo.shows.includes(showId))
  },

  getPromosByTimeSlot: (timeSlot) => {
    return get().promos.filter(promo => promo.timeSlots.includes(timeSlot as any))
  },

  // Category actions
  addCategory: (categoryData) => {
    const newCategory: PromoCategory = {
      ...categoryData,
      id: `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    set(state => ({
      categories: [...state.categories, newCategory]
    }))
    
    return newCategory
  },

  updateCategory: (id, updates) => {
    set(state => ({
      categories: state.categories.map(category =>
        category.id === id 
          ? { ...category, ...updates, updatedAt: new Date() }
          : category
      )
    }))
  },

  deleteCategory: (id) => {
    set(state => ({
      categories: state.categories.filter(category => category.id !== id)
    }))
  },

  getCategory: (id) => {
    return get().categories.find(category => category.id === id)
  },

  // Utility actions
  searchPromos: (query) => {
    const lowercaseQuery = query.toLowerCase()
    return get().promos.filter(promo =>
      promo.name.toLowerCase().includes(lowercaseQuery) ||
      promo.filename.toLowerCase().includes(lowercaseQuery) ||
      promo.categories.some(cat => cat.toLowerCase().includes(lowercaseQuery))
    )
  },

  getPromoStats: () => {
    const promos = get().promos
    const categories = get().categories
    
    const byCategory: Record<string, number> = {}
    const byTimeSlot: Record<string, number> = {}
    
    // Initialize counters
    categories.forEach(cat => {
      byCategory[cat.name] = 0
    })
    
    const timeSlots = ['morning', 'afternoon', 'evening', 'late-night', 'weekend']
    timeSlots.forEach(slot => {
      byTimeSlot[slot] = 0
    })
    
    // Count promos
    promos.forEach(promo => {
      promo.categories.forEach(catId => {
        const category = categories.find(c => c.id === catId)
        if (category) {
          byCategory[category.name] = (byCategory[category.name] || 0) + 1
        }
      })
      
      promo.timeSlots.forEach(slot => {
        byTimeSlot[slot] = (byTimeSlot[slot] || 0) + 1
      })
    })
    
    return {
      total: promos.length,
      byCategory,
      byTimeSlot
    }
  },

  initializeDefaultData: () => {
    set({
      promos: createMockPromos(),
      categories: createMockCategories()
    })
  }
})) 