import { Mail, Bell, Webhook, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'

export function NotificationSettings() {
  const { settings, updateNotificationSettings } = useSettingsStore()
  const { notifications } = settings

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="email-enabled"
              checked={notifications.emailEnabled}
              onChange={(e) => updateNotificationSettings({ emailEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="email-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable email notifications
            </label>
          </div>

          {notifications.emailEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={notifications.emailAddress}
                  onChange={(e) => updateNotificationSettings({ emailAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="alerts@radiostation.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Server
                </label>
                <input
                  type="text"
                  value={notifications.smtpServer}
                  onChange={(e) => updateNotificationSettings({ smtpServer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={notifications.smtpPort}
                  onChange={(e) => updateNotificationSettings({ smtpPort: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={notifications.smtpUsername}
                  onChange={(e) => updateNotificationSettings({ smtpUsername: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Alert Types</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(notifications.alertTypes).map(([key, enabled]) => (
            <div key={key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`alert-${key}`}
                checked={enabled}
                onChange={(e) => updateNotificationSettings({
                  alertTypes: { ...notifications.alertTypes, [key]: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`alert-${key}`} className="text-sm text-gray-700 dark:text-gray-300">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
} 