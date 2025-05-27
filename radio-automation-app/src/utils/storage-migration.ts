export function migrateLocalStorage() {
  try {
    // List of localStorage keys used by the app
    const storeKeys = [
      'radio-automation-shows',
      'radio-automation-file-queue',
      'radio-automation-monitoring',
      'radio-automation-ftp-profiles'
    ]

    console.log('🔄 Checking localStorage for migration...')

    storeKeys.forEach(key => {
      const stored = localStorage.getItem(key)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          
          // Check if the data structure is valid
          if (key === 'radio-automation-shows') {
            if (parsed.state && !Array.isArray(parsed.state.shows)) {
              console.log(`⚠️  Invalid shows data structure, clearing ${key}`)
              localStorage.removeItem(key)
            }
          } else if (key === 'radio-automation-file-queue') {
            if (parsed.state && !Array.isArray(parsed.state.files)) {
              console.log(`⚠️  Invalid file queue data structure, clearing ${key}`)
              localStorage.removeItem(key)
            }
          }
        } catch (error) {
          console.log(`⚠️  Corrupted data in ${key}, clearing...`)
          localStorage.removeItem(key)
        }
      }
    })

    console.log('✅ Storage migration complete')
  } catch (error) {
    console.error('❌ Error during storage migration:', error)
  }
}

export function clearAllAppData() {
  const storeKeys = [
    'radio-automation-shows',
    'radio-automation-file-queue', 
    'radio-automation-monitoring',
    'radio-automation-ftp-profiles'
  ]

  storeKeys.forEach(key => {
    localStorage.removeItem(key)
  })

  console.log('🧹 All app data cleared from localStorage')
} 