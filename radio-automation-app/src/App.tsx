import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { Shows } from '@/features/shows/Shows'
import { Processing } from '@/features/processing/Processing'
import { AudioProcessing } from '@/features/audio/AudioProcessing'
import { FTPSettings } from '@/features/ftp/FTPSettings'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/ftp" element={<FTPSettings />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/audio" element={<AudioProcessing />} />
          <Route path="/promos" element={<div className="text-center py-12"><h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Promo Library</h2><p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p></div>} />
          <Route path="/settings" element={<div className="text-center py-12"><h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2><p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p></div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
