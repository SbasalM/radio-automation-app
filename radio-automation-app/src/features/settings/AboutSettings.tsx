import { Info, Download, ExternalLink, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'

export function AboutSettings() {
  const { settings } = useSettingsStore()

  const handleCheckUpdates = () => {
    alert('Checking for updates... (This would connect to update server)')
  }

  const handleExportDiagnostics = () => {
    alert('Exporting diagnostics... (This would generate a diagnostic report)')
  }

  return (
    <div className="space-y-6">
      {/* Application Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Application Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Application Name</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{settings.general.appName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Version</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{settings.version}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Build Date</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">December 2024</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Environment</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Development</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>License</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">License Type</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">MIT License</div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Copyright © 2024 Radio Flow. All rights reserved.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600 dark:text-gray-400">Operating System</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{navigator.platform}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Browser</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                 navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Screen Resolution</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {window.screen.width} × {window.screen.height}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Memory</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {navigator.hardwareConcurrency || 'Unknown'} cores
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={handleCheckUpdates} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Check for Updates
            </Button>
            
            <Button variant="outline" onClick={handleExportDiagnostics} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Export Diagnostics
            </Button>
          </div>

          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => window.open('https://github.com/radio-flow', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentation & Support
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardContent className="text-center py-6">
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Built with React, TypeScript, and Tailwind CSS
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            Icons by Lucide React • UI Components by shadcn/ui
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 