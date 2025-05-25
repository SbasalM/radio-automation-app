import { useState } from 'react'
import { Plus, Edit, Trash2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShowFormModal } from './ShowFormModal'
import { useShowStore } from '@/store/show-store'
import type { ShowProfile } from '@/types/show'

export function Shows() {
  const { shows, deleteShow, updateShow } = useShowStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingShow, setEditingShow] = useState<ShowProfile | null>(null)

  const activeShows = shows.filter(show => show.enabled)
  const totalShows = shows.length

  const handleAddShow = () => {
    setEditingShow(null)
    setIsModalOpen(true)
  }

  const handleEditShow = (show: ShowProfile) => {
    setEditingShow(show)
    setIsModalOpen(true)
  }

  const handleDeleteShow = (id: string) => {
    if (confirm('Are you sure you want to delete this show profile?')) {
      deleteShow(id)
    }
  }

  const handleToggleShow = (show: ShowProfile) => {
    updateShow(show.id, { enabled: !show.enabled })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Show Profiles
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your radio show processing configurations
          </p>
        </div>
        <Button onClick={handleAddShow}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Show
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShows}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Configured profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shows</CardTitle>
            <Radio className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeShows.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Shows</CardTitle>
            <Radio className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {totalShows - activeShows.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Disabled profiles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Show Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {shows.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No show profiles yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get started by creating your first show profile to automate file processing.
              </p>
              <Button onClick={handleAddShow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Show
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Show Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      File Patterns
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Output Directory
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Last Updated
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shows.map((show) => (
                    <tr
                      key={show.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {show.name}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleShow(show)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                            show.enabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {show.enabled ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {show.filePatterns.length} pattern{show.filePatterns.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                          {show.filePatterns[0]?.pattern || 'No patterns'}
                          {show.filePatterns.length > 1 && ` +${show.filePatterns.length - 1} more`}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {show.outputDirectory}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(show.updatedAt)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditShow(show)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteShow(show.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <ShowFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingShow={editingShow}
      />
    </div>
  )
} 