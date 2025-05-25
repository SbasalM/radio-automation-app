import { Moon, Sun, Monitor, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { useMonitoringStore } from '@/store/monitoring-store'

export function Header() {
  const { theme, setTheme } = useTheme()
  const { isMonitoring } = useMonitoringStore()

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">RA</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Radio Automation Flow
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Monitoring Status */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
            <Circle 
              className={`h-2 w-2 ${
                isMonitoring 
                  ? 'text-green-500 fill-current animate-pulse' 
                  : 'text-gray-400 fill-current'
              }`} 
            />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0"
          >
            {getThemeIcon()}
          </Button>
        </div>
      </div>
    </header>
  )
} 