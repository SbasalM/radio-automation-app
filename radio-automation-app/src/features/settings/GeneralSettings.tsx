import { Globe, Palette, Type, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'

const timezones = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo'
]

const languages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' }
]

export function GeneralSettings() {
  const { settings, updateGeneralSettings } = useSettingsStore()
  const { general } = settings

  return (
    <div className="space-y-6">
      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Type className="h-5 w-5" />
            <span>Application</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Application Name
              </label>
              <input
                type="text"
                value={general.appName}
                onChange={(e) => updateGeneralSettings({ appName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Radio Flow"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This name appears in the header and browser title
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={general.language}
                onChange={(e) => updateGeneralSettings({ language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Interface language (requires restart)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Regional Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={general.timezone}
                onChange={(e) => updateGeneralSettings({ timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used for scheduling and timestamps
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <select
                value={general.dateFormat}
                onChange={(e) => updateGeneralSettings({ dateFormat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                <option value="dd MMM yyyy">dd MMM yyyy</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Example: {new Date().toLocaleDateString('en-US')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Format
              </label>
              <select
                value={general.timeFormat}
                onChange={(e) => updateGeneralSettings({ timeFormat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Example: {new Date().toLocaleTimeString('en-US', { hour12: general.timeFormat === '12h' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Appearance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                value={general.theme}
                onChange={(e) => updateGeneralSettings({ theme: e.target.value as 'light' | 'dark' | 'auto' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose your preferred color scheme
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="compact-mode"
                  checked={general.compactMode}
                  onChange={(e) => updateGeneralSettings({ compactMode: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="compact-mode" className="text-sm text-gray-700 dark:text-gray-300">
                  Compact mode
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Reduce spacing and padding for more content
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="show-tooltips"
                  checked={general.showTooltips}
                  onChange={(e) => updateGeneralSettings({ showTooltips: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="show-tooltips" className="text-sm text-gray-700 dark:text-gray-300">
                  Show tooltips
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Display helpful tips when hovering over elements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Application: <span className="font-medium text-gray-900 dark:text-gray-100">{general.appName}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Current time: <span className="font-medium text-gray-900 dark:text-gray-100">
                {new Date().toLocaleString('en-US', {
                  timeZone: general.timezone,
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                  hour12: general.timeFormat === '12h'
                })}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Language: <span className="font-medium text-gray-900 dark:text-gray-100">
                {languages.find(l => l.code === general.language)?.name}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Theme: <span className="font-medium text-gray-900 dark:text-gray-100">
                {general.theme} {general.compactMode && '(compact)'} {general.showTooltips && '(tooltips)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 