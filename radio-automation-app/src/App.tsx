import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { TestComponent } from '@/components/TestComponent'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { Shows } from '@/features/shows/Shows'
import { Processing } from '@/features/processing/Processing'
import { AudioProcessing } from '@/features/audio/AudioProcessing'
import { PromoLibrary } from '@/features/promos/PromoLibrary'
import { AutoTagging } from '@/features/promos/AutoTagging'
import { AutoTagDashboard } from '@/features/promos/AutoTagDashboard'
import { FTPSettings } from '@/features/ftp/FTPSettings'
import { Settings } from '@/features/settings/Settings'
import { migrateLocalStorage } from '@/utils/storage-migration'

function App() {
  // Run migration on app startup
  useEffect(() => {
    migrateLocalStorage()
  }, [])
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/ftp" element={<FTPSettings />} />
          <Route path="/processing" element={
            <ErrorBoundary>
              <Processing />
            </ErrorBoundary>
          } />
          <Route path="/audio" element={<AudioProcessing />} />
          <Route path="/promos" element={<PromoLibrary />} />
          <Route path="/auto-tagging" element={<AutoTagging />} />
          <Route path="/auto-tag" element={<AutoTagDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/test" element={
            <ErrorBoundary>
              <TestComponent />
            </ErrorBoundary>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
