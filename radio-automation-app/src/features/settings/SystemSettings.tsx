import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SystemSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            System configuration options coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 