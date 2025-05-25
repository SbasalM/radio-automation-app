import { useState, useEffect } from 'react'
import { X, TestTube, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFTPStore } from '@/store/ftp-store'
import { ftpService } from '@/services/ftp-service'
import type { FTPProfile } from '@/types/ftp'

interface FTPProfileFormProps {
  isOpen: boolean
  onClose: () => void
  editingProfile?: FTPProfile | null
}

export function FTPProfileForm({ isOpen, onClose, editingProfile }: FTPProfileFormProps) {
  const { addProfile, updateProfile } = useFTPStore()
  
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 21,
    username: '',
    password: '',
    protocol: 'ftp' as 'ftp' | 'ftps' | 'sftp',
    basePath: '/',
    enabled: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (editingProfile) {
      setFormData({
        name: editingProfile.name,
        host: editingProfile.host,
        port: editingProfile.port,
        username: editingProfile.username,
        password: editingProfile.password,
        protocol: editingProfile.protocol,
        basePath: editingProfile.basePath,
        enabled: editingProfile.enabled
      })
    } else {
      setFormData({
        name: '',
        host: '',
        port: 21,
        username: '',
        password: '',
        protocol: 'ftp',
        basePath: '/',
        enabled: true
      })
    }
    setErrors({})
    setTestResult(null)
  }, [editingProfile, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Profile name is required'
    }

    if (!formData.host.trim()) {
      newErrors.host = 'Host is required'
    }

    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }

    if (!formData.basePath.trim()) {
      newErrors.basePath = 'Base path is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (editingProfile) {
      updateProfile(editingProfile.id, formData)
    } else {
      addProfile(formData)
    }

    onClose()
  }

  const handleTestConnection = async () => {
    if (!validateForm()) return

    setIsTestingConnection(true)
    setTestResult(null)

    try {
      // Create a temporary profile for testing
      const testProfile: FTPProfile = {
        ...formData,
        id: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const success = await ftpService.testConnection(testProfile)
      
      setTestResult({
        success,
        message: success 
          ? 'Connection successful!' 
          : 'Connection failed. Please check your credentials and try again.'
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error}`
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const getDefaultPort = (protocol: string) => {
    switch (protocol) {
      case 'ftp': return 21
      case 'ftps': return 990
      case 'sftp': return 22
      default: return 21
    }
  }

  const handleProtocolChange = (newProtocol: 'ftp' | 'ftps' | 'sftp') => {
    setFormData({
      ...formData,
      protocol: newProtocol,
      port: getDefaultPort(newProtocol)
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle>
            {editingProfile ? 'Edit FTP Profile' : 'Add FTP Profile'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Main Station FTP"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Host *
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ftp.example.com"
              />
              {errors.host && <p className="text-red-500 text-sm mt-1">{errors.host}</p>}
            </div>

            {/* Protocol and Port */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Protocol *
                </label>
                <select
                  value={formData.protocol}
                  onChange={(e) => handleProtocolChange(e.target.value as 'ftp' | 'ftps' | 'sftp')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ftp">FTP</option>
                  <option value="ftps">FTPS</option>
                  <option value="sftp">SFTP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Port *
                </label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 21 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.port && <p className="text-red-500 text-sm mt-1">{errors.port}</p>}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="username"
              />
              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Base Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Path *
              </label>
              <input
                type="text"
                value={formData.basePath}
                onChange={(e) => setFormData({ ...formData, basePath: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="/path/to/files"
              />
              {errors.basePath && <p className="text-red-500 text-sm mt-1">{errors.basePath}</p>}
            </div>

            {/* Enable Profile */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable this profile
              </label>
            </div>

            {/* Test Connection */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {testResult && (
                <div className={`mt-3 p-3 rounded-md ${
                  testResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}>
                  <p className="text-sm font-medium">{testResult.message}</p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingProfile ? 'Update Profile' : 'Create Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 