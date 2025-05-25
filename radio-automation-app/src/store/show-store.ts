import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShowProfile, FilePattern } from '@/types/show'

interface ShowStore {
  shows: ShowProfile[]
  addShow: (show: Omit<ShowProfile, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateShow: (id: string, updates: Partial<ShowProfile>) => void
  deleteShow: (id: string) => void
  getShow: (id: string) => ShowProfile | undefined
  getAllShows: () => ShowProfile[]
  getActiveShows: () => ShowProfile[]
}

// Mock data for demonstration
const mockShows: ShowProfile[] = [
  {
    id: '1',
    name: 'Morning Show',
    enabled: true,
    filePatterns: [
      {
        id: 'fp1',
        pattern: 'MorningShow_*.mp3',
        type: 'watch'
      },
      {
        id: 'fp2', 
        pattern: 'MS_*.*',
        type: 'ftp',
        ftpProfileId: 'ftp1'
      }
    ],
    outputDirectory: '/processed/morning-show',
    trimSettings: {
      startSeconds: 2,
      endSeconds: 1,
      fadeIn: true,
      fadeOut: true
    },
    processingOptions: {
      normalize: true,
      addPromoTag: true,
      promoTagId: 'promo1'
    },
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-20T10:30:00Z')
  },
  {
    id: '2',
    name: 'Evening News',
    enabled: true,
    filePatterns: [
      {
        id: 'fp3',
        pattern: 'EveningNews_*.wav',
        type: 'watch'
      }
    ],
    outputDirectory: '/processed/evening-news',
    trimSettings: {
      startSeconds: 0,
      endSeconds: 0,
      fadeIn: false,
      fadeOut: false
    },
    processingOptions: {
      normalize: true,
      addPromoTag: false
    },
    createdAt: new Date('2024-01-10T16:00:00Z'),
    updatedAt: new Date('2024-01-18T14:15:00Z')
  },
  {
    id: '3',
    name: 'Weekend Sports',
    enabled: false,
    filePatterns: [
      {
        id: 'fp4',
        pattern: 'Sports_Weekend_*.*',
        type: 'ftp',
        ftpProfileId: 'ftp2'
      }
    ],
    outputDirectory: '/processed/sports',
    trimSettings: {
      startSeconds: 3,
      endSeconds: 2,
      fadeIn: true,
      fadeOut: true
    },
    processingOptions: {
      normalize: false,
      addPromoTag: true,
      promoTagId: 'promo2'
    },
    createdAt: new Date('2024-01-05T12:00:00Z'),
    updatedAt: new Date('2024-01-05T12:00:00Z')
  }
]

export const useShowStore = create<ShowStore>()(
  persist(
    (set, get) => ({
      shows: mockShows,
      
      addShow: (showData) => {
        const newShow: ShowProfile = {
          ...showData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
        set((state) => ({
          shows: [...state.shows, newShow]
        }))
      },
      
      updateShow: (id, updates) => {
        set((state) => ({
          shows: state.shows.map((show) =>
            show.id === id
              ? { ...show, ...updates, updatedAt: new Date() }
              : show
          )
        }))
      },
      
      deleteShow: (id) => {
        set((state) => ({
          shows: state.shows.filter((show) => show.id !== id)
        }))
      },
      
      getShow: (id) => {
        return get().shows.find((show) => show.id === id)
      },
      
      getAllShows: () => {
        return get().shows
      },
      
      getActiveShows: () => {
        return get().shows.filter((show) => show.enabled)
      }
    }),
    {
      name: 'radio-automation-shows',
    }
  )
) 