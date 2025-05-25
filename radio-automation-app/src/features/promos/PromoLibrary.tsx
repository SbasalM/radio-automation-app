import { useState, useEffect } from 'react'
import { Plus, Search, Grid, List, Download, Trash2, Play, Pause, Filter, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { PromoUploadForm } from './PromoUploadForm'
import { usePromoStore } from '@/store/promo-store'
import { useShowStore } from '@/store/show-store'
import type { PromoFile } from '@/types/audio'

export function PromoLibrary() {
  const { 
    promos, 
    categories, 
    getPromoStats, 
    searchPromos, 
    deletePromo, 
    getPromosByCategory,
    initializeDefaultData 
  } = usePromoStore()
  const { getShow } = useShowStore()

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPromos, setSelectedPromos] = useState<string[]>([])
  const [playingPromo, setPlayingPromo] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)

  // Initialize default data on mount
  useEffect(() => {
    if (promos.length === 0) {
      initializeDefaultData()
    }
  }, [promos.length, initializeDefaultData])

  // Filter promos based on search and category
  const filteredPromos = () => {
    let filtered = promos
    
    if (searchQuery) {
      filtered = searchPromos(searchQuery)
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(promo => promo.categories.includes(selectedCategory))
    }
    
    return filtered
  }

  const stats = getPromoStats()

  const handleBulkDelete = () => {
    if (selectedPromos.length === 0) return
    
    if (confirm(`Delete ${selectedPromos.length} selected promos?`)) {
      selectedPromos.forEach(id => deletePromo(id))
      setSelectedPromos([])
    }
  }

  const handleSelectAll = () => {
    if (selectedPromos.length === filteredPromos().length) {
      setSelectedPromos([])
    } else {
      setSelectedPromos(filteredPromos().map(p => p.id))
    }
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${Math.round(mb * 1024)}KB` : `${mb.toFixed(1)}MB`
  }

  const PromoCard = ({ promo }: { promo: PromoFile }) => {
    const isSelected = selectedPromos.includes(promo.id)
    const isPlaying = playingPromo === promo.id
    const categoryColors = categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.color }), {})

    return (
      <Card className={`transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                {promo.name}
              </CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {promo.filename} • {formatDuration(promo.duration)}
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedPromos([...selectedPromos, promo.id])
                } else {
                  setSelectedPromos(selectedPromos.filter(id => id !== promo.id))
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Categories */}
          <div className="flex flex-wrap gap-1">
            {promo.categories.map(catId => {
              const category = categories.find(c => c.id === catId)
              return category ? (
                <span
                  key={catId}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color
                  }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </span>
              ) : null
            })}
          </div>

          {/* Shows */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Shows:</strong> {promo.shows.map(showId => {
              const show = getShow(showId)
              return show?.name || 'Unknown'
            }).join(', ')}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Plays:</span>
              <span className="ml-2 font-medium">{promo.playCount}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Size:</span>
              <span className="ml-2 font-medium">{formatFileSize(promo.audioFile.fileSize)}</span>
            </div>
          </div>

          {/* Last Played */}
          {promo.lastPlayed && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last played: {promo.lastPlayed.toLocaleDateString()}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlayingPromo(isPlaying ? null : promo.id)}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isPlaying ? 'Stop' : 'Preview'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deletePromo(promo.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Audio Player */}
          {isPlaying && (
            <div className="mt-4">
              <AudioPlayer
                audioFile={promo.audioFile}
                onPlayStateChange={(playing) => {
                  if (!playing) setPlayingPromo(null)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const PromoRow = ({ promo }: { promo: PromoFile }) => {
    const isSelected = selectedPromos.includes(promo.id)
    const isPlaying = playingPromo === promo.id

    return (
      <tr className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
        <td className="py-4 px-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedPromos([...selectedPromos, promo.id])
              } else {
                setSelectedPromos(selectedPromos.filter(id => id !== promo.id))
              }
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>
        <td className="py-4 px-4">
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{promo.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{promo.filename}</div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-wrap gap-1">
            {promo.categories.slice(0, 2).map(catId => {
              const category = categories.find(c => c.id === catId)
              return category ? (
                <span
                  key={catId}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color
                  }}
                >
                  {category.name}
                </span>
              ) : null
            })}
            {promo.categories.length > 2 && (
              <span className="text-xs text-gray-500">+{promo.categories.length - 2}</span>
            )}
          </div>
        </td>
        <td className="py-4 px-4 text-sm text-gray-900 dark:text-gray-100">
          {formatDuration(promo.duration)}
        </td>
        <td className="py-4 px-4 text-sm text-gray-900 dark:text-gray-100">
          {promo.playCount}
        </td>
        <td className="py-4 px-4 text-sm text-gray-900 dark:text-gray-100">
          {formatFileSize(promo.audioFile.fileSize)}
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlayingPromo(isPlaying ? null : promo.id)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deletePromo(promo.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Promo Library</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage station promos and promotional content
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Promo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {categories.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {promos.reduce((sum, p) => sum + p.playCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatFileSize(promos.reduce((sum, p) => sum + p.audioFile.fileSize, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search promos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View and Actions */}
            <div className="flex items-center gap-2">
              {selectedPromos.length > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedPromos.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
              >
                {view === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredPromos().length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              {searchQuery || selectedCategory !== 'all' ? 'No promos match your filters' : 'No promos uploaded yet'}
            </div>
            {!searchQuery && selectedCategory === 'all' && (
              <Button className="mt-4" onClick={() => setShowUploadForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Promo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromos().map(promo => (
            <PromoCard key={promo.id} promo={promo} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedPromos.length === filteredPromos().length && filteredPromos().length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Categories</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Duration</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Plays</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromos().map(promo => (
                    <PromoRow key={promo.id} promo={promo} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Form Modal placeholder */}
      {showUploadForm && (
        <PromoUploadForm
          onClose={() => setShowUploadForm(false)}
          onSuccess={(promo) => {
            console.log('Promo uploaded successfully:', promo.name)
            setShowUploadForm(false)
          }}
        />
      )}
    </div>
  )
} 