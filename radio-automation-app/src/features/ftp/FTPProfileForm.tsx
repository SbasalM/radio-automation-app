import React, { useState, useEffect, useMemo } from 'react'
import { X, TestTube, CheckCircle, XCircle, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FTPDirectoryBrowser } from '@/components/FTPDirectoryBrowser'
import { useFTPStore } from '@/store/ftp-store'
import { ftpService } from '@/services/ftp-service'
import type { FTPProfile } from '@/types/ftp'
import { isPasswordEncrypted, decryptPassword } from '@/utils/security'

interface FTPProfileFormProps {
  isOpen: boolean
  onClose: () => void
  editingProfile?: FTPProfile | null
}

export function FTPProfileForm({ isOpen, onClose, editingProfile }: FTPProfileFormProps) {
  const { addProfile, updateProfile } = useFTPStore()
  
  const [formData, setFormData] = useState<Omit<FTPProfile, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    host: '',
    port: 21,
    username: '',
    password: '',
    protocol: 'ftp',
    basePath: '/',
    enabled: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [originalPassword, setOriginalPassword] = useState('')

  // Memoize form validation to prevent infinite re-renders
  const isFormValid = useMemo(() => {
    // For editing profiles with encrypted passwords, allow submission if password hasn't changed or if it has been changed to a valid value
    const passwordValid = editingProfile && !passwordChanged 
      ? true // Keep existing encrypted password
      : formData.password.trim() && formData.password !== '••••••••••••' // New password required
    
    return formData.name.trim() &&
           formData.host.trim() &&
           formData.port >= 1 && formData.port <= 65535 &&
           formData.username.trim() &&
           passwordValid &&
           formData.basePath.trim()
  }, [formData, editingProfile, passwordChanged])

  // Memoize profile object for directory browser
  const browserProfile = useMemo(() => {
    // Use the correct password for directory browsing
    let passwordForBrowser = formData.password
    
    // If editing an existing profile and password hasn't changed, use the original password
    if (editingProfile && !passwordChanged && formData.password === '••••••••••••') {
      passwordForBrowser = originalPassword
    }
    
    return {
      host: formData.host,
      port: formData.port,
      username: formData.username,
      password: passwordForBrowser,
      protocol: formData.protocol
    }
  }, [formData.host, formData.port, formData.username, formData.password, formData.protocol, editingProfile, passwordChanged, originalPassword])

  useEffect(() => {
    if (editingProfile) {
      // Check if password is encrypted
      const isEncrypted = editingProfile.password && isPasswordEncrypted(editingProfile.password)
      
      setFormData({
        name: editingProfile.name,
        host: editingProfile.host,
        port: editingProfile.port,
        username: editingProfile.username,
        password: isEncrypted ? '••••••••••••' : editingProfile.password, // Show placeholder for encrypted passwords
        protocol: editingProfile.protocol,
        basePath: editingProfile.basePath,
        enabled: editingProfile.enabled
      })
      
      // Store the original password for comparison
      setOriginalPassword(editingProfile.password)
      setPasswordChanged(false)
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
      setOriginalPassword('')
      setPasswordChanged(false)
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

    // Password validation with encryption handling
    if (editingProfile && !passwordChanged) {
      // Existing profile with unchanged password - this is valid
    } else if (!formData.password.trim() || formData.password === '••••••••••••') {
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

    // Prepare the profile data with proper password handling
    const profileData = { ...formData }
    
    if (editingProfile && !passwordChanged) {
      // Keep the original encrypted password if it hasn't changed
      profileData.password = originalPassword
    }
    // If password has changed or this is a new profile, it will be encrypted by the store

    if (editingProfile) {
      updateProfile(editingProfile.id, profileData)
    } else {
      addProfile(profileData)
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

      const result = await ftpService.testConnection(testProfile)
      
      setTestResult({
        success: result.success,
        message: result.message || (result.success 
          ? 'Connection successful!' 
          : 'Connection failed. Please check your credentials and try again.')
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

  // Handler for password changes
  const handlePasswordChange = (newPassword: string) => {
    setFormData({ ...formData, password: newPassword })
    setPasswordChanged(newPassword !== '••••••••••••')
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
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              {editingProfile && !passwordChanged && formData.password === '••••••••••••' && (
                <p className="text-gray-500 text-xs mt-1">
                  Password is encrypted and stored securely. Enter a new password to change it.
                </p>
              )}
            </div>

            {/* Base Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Path *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.basePath}
                  onChange={(e) => setFormData({ ...formData, basePath: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="/path/to/files"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDirectoryBrowser(true)}
                  disabled={!formData.host || !formData.username || (!formData.password && !(editingProfile && originalPassword))}
                  className="px-3"
                >
                  <Folder className="h-4 w-4" />
                </Button>
              </div>
              {errors.basePath && <p className="text-red-500 text-sm mt-1">{errors.basePath}</p>}
              {(!formData.host || !formData.username || (!formData.password && !(editingProfile && originalPassword))) && (
                <p className="text-gray-500 text-xs mt-1">
                  Fill in host, username, and password first to browse directories
                </p>
              )}
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
                onClick={handleTestConnection}
                disabled={isTestingConnection || !isFormValid}
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <TestTube className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {/* Test Result */}
              {testResult && (
                <div className={`p-3 rounded-md flex items-center space-x-2 ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isTestingConnection}>
                {editingProfile ? 'Update Profile' : 'Add Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Directory Browser Modal */}
      <FTPDirectoryBrowser
        profile={browserProfile}
        isOpen={showDirectoryBrowser}
        onClose={() => setShowDirectoryBrowser(false)}
        onSelectPath={(path) => {
          setFormData({ ...formData, basePath: path })
          setShowDirectoryBrowser(false)
        }}
        initialPath={formData.basePath}
      />
    </div>
  )
} 