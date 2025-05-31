import { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, ChevronLeft, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { decryptPassword, isPasswordEncrypted } from '@/utils/security'

interface FTPProfile {
  host: string
  port: number
  username: string
  password: string
  protocol: 'ftp' | 'ftps' | 'sftp'
}

interface DirectoryItem {
  name: string
  type: 'directory' | 'file'
  size?: number
  modified?: Date
  permissions?: string
}

interface FTPDirectoryBrowserProps {
  profile: FTPProfile
  isOpen: boolean
  onClose: () => void
  onSelectPath: (path: string) => void
  initialPath?: string
}

export function FTPDirectoryBrowser({ 
  profile, 
  isOpen, 
  onClose, 
  onSelectPath, 
  initialPath = '/' 
}: FTPDirectoryBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [directories, setDirectories] = useState<DirectoryItem[]>([])
  const [files, setFiles] = useState<DirectoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pathHistory, setPathHistory] = useState<string[]>(['/'])

  useEffect(() => {
    if (isOpen && profile.host) {
      loadDirectory(currentPath)
    }
  }, [isOpen, currentPath, profile])

  const loadDirectory = async (path: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Prepare profile with decrypted password for backend
      const isEncrypted = profile.password && isPasswordEncrypted(profile.password)
      console.log('🔐 FTPDirectoryBrowser: Password encrypted?', isEncrypted)
      console.log('🔐 FTPDirectoryBrowser: Original password length:', profile.password?.length)
      console.log('🔐 FTPDirectoryBrowser: Original password starts with:', profile.password?.substring(0, 10))
      
      const preparedProfile = {
        ...profile,
        password: isEncrypted ? decryptPassword(profile.password) : profile.password
      }
      
      console.log('🔐 FTPDirectoryBrowser: Prepared password length:', preparedProfile.password?.length)
      console.log('🔐 FTPDirectoryBrowser: Prepared password starts with:', preparedProfile.password?.substring(0, 10))
      console.log('📁 FTPDirectoryBrowser: Browsing', path, 'on', profile.host)
      console.log('📁 FTPDirectoryBrowser: Sending profile:', {
        host: preparedProfile.host,
        port: preparedProfile.port,
        username: preparedProfile.username,
        passwordLength: preparedProfile.password?.length,
        protocol: preparedProfile.protocol
      })
      
      const response = await fetch('/api/ftp/browse-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile: preparedProfile, path })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDirectories(result.directories || [])
        setFiles(result.files || [])
        setCurrentPath(result.currentPath)
      } else {
        console.error('❌ FTPDirectoryBrowser: Backend error:', result)
        setError(result.message || 'Failed to browse directory')
      }
    } catch (error: any) {
      console.error('❌ FTPDirectoryBrowser: Request error:', error)
      setError(`Connection error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToDirectory = (dirName: string) => {
    const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`
    setPathHistory([...pathHistory, newPath])
    setCurrentPath(newPath)
  }

  const navigateUp = () => {
    if (currentPath === '/') return
    
    const pathParts = currentPath.split('/').filter(Boolean)
    pathParts.pop()
    const newPath = pathParts.length === 0 ? '/' : `/${pathParts.join('/')}`
    
    setPathHistory([...pathHistory, newPath])
    setCurrentPath(newPath)
  }

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory]
      newHistory.pop()
      const previousPath = newHistory[newHistory.length - 1]
      setPathHistory(newHistory)
      setCurrentPath(previousPath)
    }
  }

  const navigateToRoot = () => {
    setPathHistory(['/'])
    setCurrentPath('/')
  }

  const selectCurrentPath = () => {
    onSelectPath(currentPath)
    onClose()
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDate = (date?: Date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Folder className="h-5 w-5" />
            <span>Browse FTP Directory</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={navigateToRoot}>
              <Home className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={navigateBack}
              disabled={pathHistory.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => loadDirectory(currentPath)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto">
          {/* Current Path Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Path:
                </span>
                <code className="text-sm bg-white dark:bg-gray-900 px-2 py-1 rounded border">
                  {currentPath}
                </code>
              </div>
              <Button onClick={selectCurrentPath} size="sm">
                Select This Directory
              </Button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateUp}
              disabled={currentPath === '/'}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Up
            </Button>
            <span className="text-sm text-gray-500 flex-1">
              {profile.host}:{profile.port}
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading directory...</span>
            </div>
          )}

          {/* Directory Listing */}
          {!isLoading && !error && (
            <div className="space-y-1">
              {/* Directories */}
              {directories.map((dir, index) => (
                <div
                  key={`dir-${index}`}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                  onClick={() => navigateToDirectory(dir.name)}
                >
                  <div className="flex items-center space-x-3">
                    <Folder className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {dir.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{dir.permissions}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))}

              {/* Files (for reference) */}
              {files.slice(0, 10).map((file, index) => (
                <div
                  key={`file-${index}`}
                  className="flex items-center justify-between p-2 opacity-60"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>{formatSize(file.size)}</span>
                    <span>{formatDate(file.modified)}</span>
                    <span>{file.permissions}</span>
                  </div>
                </div>
              ))}

              {files.length > 10 && (
                <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
                  ... and {files.length - 10} more files
                </div>
              )}

              {directories.length === 0 && files.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  This directory is empty
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}