import { useShowStore } from '@/store/show-store'
import { useFileQueueStore } from '@/store/file-queue-store'
import { useMonitoringStore } from '@/store/monitoring-store'
import { FileStatus } from '@/types/file'
import type { ShowProfile } from '@/types/show'

class WatchService {
  private intervalId: NodeJS.Timeout | null = null
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map()

  // Mock file names for simulation
  private mockFiles = [
    'MorningShow_Episode1.mp3',
    'MorningShow_Interview.wav',
    'MorningShow_News.mp3',
    'EveningNews_Headlines.wav',
    'EveningNews_Weather.mp3',
    'EveningNews_Sports.wav',
    'Sports_Weekend_Highlights.mp3',
    'Sports_Weekend_Interview.wav',
    'MS_Special.mp3',
    'Morning_Comedy.wav',
    'News_Breaking.mp3',
    'Weekend_Recap.mp3'
  ]

  private usedFiles: Set<string> = new Set()

  start() {
    if (this.intervalId) return

    console.log('🔍 Starting file monitoring service...')
    
    this.intervalId = setInterval(() => {
      this.scanForFiles()
    }, 30000) // Scan every 30 seconds

    // Also scan immediately
    this.scanForFiles()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    // Clear all processing intervals
    this.processingIntervals.forEach((interval) => {
      clearTimeout(interval)
    })
    this.processingIntervals.clear()

    console.log('⏹️ File monitoring service stopped')
  }

  private scanForFiles() {
    const { getActiveShows } = useShowStore.getState()
    const { addFile, getQueuedFiles } = useFileQueueStore.getState()
    const { updateLastScanTime } = useMonitoringStore.getState()

    const activeShows = getActiveShows()
    const existingFiles = getQueuedFiles()

    if (activeShows.length === 0) {
      console.log('📭 No active shows to monitor')
      return
    }

    // Simulate finding 0-2 new files
    const filesToFind = Math.floor(Math.random() * 3) // 0, 1, or 2 files
    
    for (let i = 0; i < filesToFind; i++) {
      const foundFile = this.getRandomFile()
      if (!foundFile) continue

      const matchingShow = this.findMatchingShow(foundFile, activeShows)
      if (!matchingShow) continue

      // Check if file is already in queue
      const isDuplicate = existingFiles.some(
        (file) => file.filename === foundFile
      )

      if (isDuplicate) continue

      console.log(`📁 Found new file: ${foundFile} for show: ${matchingShow.name}`)

      // Add to queue
      addFile({
        filename: foundFile,
        showId: matchingShow.id,
        status: FileStatus.PENDING,
        sourcePath: `/watch/${matchingShow.name.toLowerCase().replace(' ', '-')}/${foundFile}`
      })

      // Get the most recently added file (the one we just added)
      const updatedFiles = getQueuedFiles()
      const addedFile = updatedFiles[updatedFiles.length - 1]

      // Start processing after a short delay
      setTimeout(() => {
        this.startProcessing(addedFile.id)
      }, 2000 + Math.random() * 3000) // 2-5 seconds delay
    }

    updateLastScanTime()
  }

  private getRandomFile(): string | null {
    const availableFiles = this.mockFiles.filter(file => !this.usedFiles.has(file))
    
    if (availableFiles.length === 0) {
      // Reset used files if we've used them all
      this.usedFiles.clear()
      return this.mockFiles[Math.floor(Math.random() * this.mockFiles.length)]
    }

    const selectedFile = availableFiles[Math.floor(Math.random() * availableFiles.length)]
    this.usedFiles.add(selectedFile)
    return selectedFile
  }

  private findMatchingShow(filename: string, shows: ShowProfile[]): ShowProfile | null {
    for (const show of shows) {
      for (const pattern of show.filePatterns) {
        if (this.matchesPattern(filename, pattern.pattern)) {
          return show
        }
      }
    }
    return null
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob matching - convert * to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
    
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(filename)
  }

  private startProcessing(fileId: string) {
    const { updateFileStatus, getQueuedFiles } = useFileQueueStore.getState()
    const { getShow } = useShowStore.getState()
    
    const file = getQueuedFiles().find(f => f.id === fileId)
    if (!file) return

    const show = getShow(file.showId)
    if (!show) return

    console.log(`⚙️ Processing file: ${file.filename}`)

    // Update to processing
    updateFileStatus(file.id, FileStatus.PROCESSING)

    // Simulate processing time (5-15 seconds)
    const processingTime = 5000 + Math.random() * 10000
    
    const processingTimeout = setTimeout(() => {
      const startTime = Date.now()
      
      // 85% success rate
      const success = Math.random() > 0.15
      
      if (success) {
        console.log(`✅ Successfully processed: ${file.filename}`)
        updateFileStatus(file.id, FileStatus.COMPLETED, {
          success: true,
          outputPath: `${show.outputDirectory}/${file.filename}`,
          processingTimeMs: Date.now() - startTime + processingTime
        })
      } else {
        const errors = [
          'Audio codec not supported',
          'File corrupted',
          'Insufficient disk space',
          'Network timeout',
          'Permission denied'
        ]
        const randomError = errors[Math.floor(Math.random() * errors.length)]
        
        console.log(`❌ Failed to process: ${file.filename} - ${randomError}`)
        updateFileStatus(file.id, FileStatus.FAILED, {
          success: false,
          error: randomError,
          processingTimeMs: Date.now() - startTime + processingTime
        })
      }

      this.processingIntervals.delete(file.id)
    }, processingTime)

    this.processingIntervals.set(file.id, processingTimeout)
  }

  retryFile(fileId: string) {
    const { updateFileStatus } = useFileQueueStore.getState()
    
    console.log(`🔄 Retrying file processing: ${fileId}`)
    updateFileStatus(fileId, FileStatus.PENDING)
    
    // Start processing after a short delay
    setTimeout(() => {
      this.startProcessing(fileId)
    }, 1000)
  }
}

// Singleton instance
export const watchService = new WatchService() 