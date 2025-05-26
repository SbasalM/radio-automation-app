import { useState } from 'react'
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'
import type { SettingsBackup } from '@/types/settings'

export function SettingsBackupComponent() {
  const { exportSettings, importSettings, settings } = useSettingsStore()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    warnings?: string[]
  } | null>(null)

  const handleExport = () => {
    const backup = exportSettings()
    const dataStr = JSON.stringify(backup, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `radio-flow-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const backup: SettingsBackup = JSON.parse(text)
      
      const result = await importSettings(backup)
      
      if (result.isValid) {
        setImportResult({
          success: true,
          message: 'Settings imported successfully!',
          warnings: result.warnings.length > 0 ? result.warnings : undefined
        })
      } else {
        setImportResult({
          success: false,
          message: `Import failed: ${result.errors.join(', ')}`
        })
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Failed to parse settings file. Please check the file format.'
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings Backup & Restore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Download your current settings as a JSON file
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full relative overflow-hidden"
              disabled={importing}
            >
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={importing}
              />
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Import Settings'}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Upload a previously exported settings file
            </p>
          </div>
        </div>

        {importResult && (
          <div className={`p-3 rounded-lg border ${
            importResult.success 
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center space-x-2">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-sm font-medium ${
                importResult.success 
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {importResult.message}
              </span>
            </div>
            
            {importResult.warnings && importResult.warnings.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                  Warnings:
                </div>
                <ul className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 list-disc list-inside">
                  {importResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <strong>Backup Information:</strong>
          <div className="mt-1">
            • Current settings last updated: {settings.lastUpdated.toLocaleString()}
          </div>
          <div>
            • Export includes all configuration sections
          </div>
          <div>
            • Import will validate settings before applying
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 