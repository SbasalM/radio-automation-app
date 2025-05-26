import { useState } from 'react'
import { Settings as SettingsIcon, Save, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'
import { GeneralSettings } from './GeneralSettings'
import { WatchFolderSettings } from './WatchFolderSettings'
import { ProcessingSettings } from './ProcessingSettings'
import { NotificationSettings } from './NotificationSettings'
import { StorageSettings } from './StorageSettings'
import { SystemSettings } from './SystemSettings'
import { AboutSettings } from './AboutSettings'

type SettingsTab = 'general' | 'watchFolders' | 'processing' | 'notifications' | 'storage' | 'system' | 'about'

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<any> }> = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'watchFolders', label: 'Watch Folders', icon: ({ className }: { className?: string }) => <div className={className}>📁</div> },
  { id: 'processing', label: 'Processing', icon: ({ className }: { className?: string }) => <div className={className}>⚙️</div> },
  { id: 'notifications', label: 'Notifications', icon: ({ className }: { className?: string }) => <div className={className}>🔔</div> },
  { id: 'storage', label: 'Storage', icon: ({ className }: { className?: string }) => <div className={className}>💾</div> },
  { id: 'system', label: 'System', icon: ({ className }: { className?: string }) => <div className={className}>🖥️</div> },
  { id: 'about', label: 'About', icon: ({ className }: { className?: string }) => <div className={className}>ℹ️</div> }
]

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  
  const { 
    settings, 
    isDirty, 
    isLoading, 
    saveSettings, 
    resetToDefaults, 
    validateSettings 
  } = useSettingsStore()

  const handleSave = async () => {
    try {
      setSaveStatus('saving')
      
      // Validate settings first
      const validation = validateSettings(settings)
      
      if (!validation.isValid) {
        console.error('Settings validation failed:', validation.errors)
        setSaveStatus('error')
        return
      }
      
      await saveSettings()
      setSaveStatus('success')
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetToDefaults()
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />
      case 'watchFolders':
        return <WatchFolderSettings />
      case 'processing':
        return <ProcessingSettings />
      case 'notifications':
        return <NotificationSettings />
      case 'storage':
        return <StorageSettings />
      case 'system':
        return <SystemSettings />
      case 'about':
        return <AboutSettings />
      default:
        return <GeneralSettings />
    }
  }

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Saving...
          </>
        )
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Saved!
          </>
        )
      case 'error':
        return (
          <>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Error
          </>
        )
      default:
        return (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure your radio automation system
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isDirty && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Unsaved changes
            </span>
          )}
          
          <Button
            variant="outline"
            onClick={handleResetAll}
            disabled={isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!isDirty || isLoading || saveStatus === 'saving'}
            className={
              saveStatus === 'success' 
                ? 'bg-green-600 hover:bg-green-700' 
                : saveStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
            }
          >
            {getSaveButtonContent()}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium rounded-none border-r-2 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-blue-500 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-400'
                        : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'error' && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to save settings. Please check your configuration and try again.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 