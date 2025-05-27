import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShowProfile, FilePattern } from '@/types/show'
import { showApiService, type CreateShowRequest } from '@/services/show-api'

interface ShowStore {
  shows: ShowProfile[]
  loading: boolean
  error: string | null
  
  // API actions
  loadShows: () => Promise<void>
  addShow: (show: CreateShowRequest) => Promise<void>
  updateShow: (id: string, updates: Partial<ShowProfile>) => Promise<void>
  deleteShow: (id: string) => Promise<void>
  
  // Local getters
  getShow: (id: string) => ShowProfile | undefined
  getAllShows: () => ShowProfile[]
  getActiveShows: () => ShowProfile[]
  
  // Error handling
  clearError: () => void
}

export const useShowStore = create<ShowStore>()(
  persist(
    (set, get) => ({
      shows: [],
      loading: false,
      error: null,
      
      loadShows: async () => {
        set({ loading: true, error: null })
        try {
          const shows = await showApiService.getAllShows()
          set({ shows, loading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load shows',
            loading: false 
          })
        }
      },
      
      addShow: async (showData) => {
        set({ loading: true, error: null })
        try {
          const newShow = await showApiService.createShow(showData)
          set((state) => {
            const shows = Array.isArray(state.shows) ? state.shows : []
            return {
              shows: [...shows, newShow],
              loading: false
            }
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create show',
            loading: false 
          })
          throw error // Re-throw to let UI handle it
        }
      },
      
      updateShow: async (id, updates) => {
        set({ loading: true, error: null })
        try {
          const updatedShow = await showApiService.updateShow(id, updates)
          set((state) => {
            const shows = Array.isArray(state.shows) ? state.shows : []
            return {
              shows: shows.map((show) =>
                show.id === id ? updatedShow : show
              ),
              loading: false
            }
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update show',
            loading: false 
          })
          throw error
        }
      },
      
      deleteShow: async (id) => {
        set({ loading: true, error: null })
        try {
          await showApiService.deleteShow(id)
          set((state) => {
            const shows = Array.isArray(state.shows) ? state.shows : []
            return {
              shows: shows.filter((show) => show.id !== id),
              loading: false
            }
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete show',
            loading: false 
          })
          throw error
        }
      },
      
      getShow: (id) => {
        const state = get()
        const shows = Array.isArray(state.shows) ? state.shows : []
        return shows.find((show) => show.id === id)
      },
      
      getAllShows: () => {
        const state = get()
        return Array.isArray(state.shows) ? state.shows : []
      },
      
      getActiveShows: () => {
        const state = get()
        const shows = Array.isArray(state.shows) ? state.shows : []
        return shows.filter((show) => show.enabled)
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'radio-automation-shows',
    }
  )
) 