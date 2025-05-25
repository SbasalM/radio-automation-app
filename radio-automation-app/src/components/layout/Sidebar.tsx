import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Radio, 
  Server, 
  Settings, 
  Mic,
  Activity,
  AudioLines,
  Target,
  Zap
} from 'lucide-react'
import { cn } from '@/utils/cn'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Shows', href: '/shows', icon: Radio },
  { name: 'FTP Settings', href: '/ftp', icon: Server },
  { name: 'Processing', href: '/processing', icon: Activity },
  { name: 'Audio Editing', href: '/audio', icon: AudioLines },
  { name: 'Promo Library', href: '/promos', icon: Mic },
  { name: 'Auto-Tagging', href: '/auto-tagging', icon: Zap },
  { name: 'Auto-Tag Dashboard', href: '/auto-tag', icon: Target },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )
            }
          >
            <item.icon
              className="mr-3 h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  )
} 