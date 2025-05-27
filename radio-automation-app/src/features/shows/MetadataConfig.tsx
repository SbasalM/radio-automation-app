import { useState } from 'react'
import { Tag, Settings2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MetadataMapping, FileNamingRules } from '@/types/show'

interface MetadataConfigProps {
  metadataMapping: MetadataMapping
  fileNamingRules: FileNamingRules
  onUpdateMapping: (mapping: MetadataMapping) => void
  onUpdateNamingRules: (rules: FileNamingRules) => void
}

// Metadata field suggestions
const METADATA_FIELDS = [
  { key: 'title', label: 'Title', placeholder: '{showName} - {date}' },
  { key: 'artist', label: 'Artist', placeholder: 'Station Name' },
  { key: 'album', label: 'Album', placeholder: '{showName} {YYYY}' },
  { key: 'year', label: 'Year', placeholder: '{YYYY}' },
  { key: 'genre', label: 'Genre', placeholder: 'Talk Radio' },
  { key: 'comment', label: 'Comment', placeholder: 'Processed by Radio Flow' }
]

export function MetadataConfig({ 
  metadataMapping, 
  fileNamingRules, 
  onUpdateMapping, 
  onUpdateNamingRules
}: MetadataConfigProps) {
  const [activeTab, setActiveTab] = useState<'metadata' | 'naming'>('metadata')

  // Provide default values if props are undefined
  const safeMetadataMapping: MetadataMapping = metadataMapping || {
    inputPatterns: [],
    extractionRules: [],
    outputMetadata: {
      title: '',
      artist: '',
      album: '',
      genre: '',
      customFields: {}
    }
  }

  const safeFileNamingRules: FileNamingRules = fileNamingRules || {
    outputPattern: '{showName}_{YYYY}-{MM}-{DD}',
    dateFormat: 'YYYY-MM-DD',
    caseConversion: 'none',
    invalidCharacterHandling: 'underscore'
  }

  // Metadata management
  const updateMetadataField = (field: string, value: string) => {
    onUpdateMapping({
      ...safeMetadataMapping,
      outputMetadata: {
        ...safeMetadataMapping.outputMetadata,
        [field]: value
      }
    })
  }

  // File naming rules management
  const updateFileNamingRule = (field: keyof FileNamingRules, value: any) => {
    onUpdateNamingRules({
      ...safeFileNamingRules,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              How File Processing Works:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>File Patterns</strong> identify which files to process (set in the Patterns tab)</li>
              <li>• <strong>Metadata Fields</strong> set the ID3 tags for processed audio files</li>
              <li>• <strong>File Naming</strong> determines the output filename structure</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <CardTitle className="flex items-center space-x-2">
              <Tag className="h-5 w-5" />
              <span>Metadata & Naming</span>
            </CardTitle>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('metadata')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'metadata'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Metadata Fields
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('naming')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'naming'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                File Naming
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Metadata Fields Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">ID3 Metadata Tags</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    METADATA_FIELDS.forEach(field => {
                      updateMetadataField(field.key, field.placeholder)
                    })
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Use Defaults
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {METADATA_FIELDS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={(safeMetadataMapping.outputMetadata[key as keyof typeof safeMetadataMapping.outputMetadata] as string) || ''}
                      onChange={(e) => updateMetadataField(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Use placeholders like {'{showName}, {date}, {YYYY}, {MM}, {DD}'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Available Placeholders:
                </h4>
                <div className="space-y-2">
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From File Pattern Extraction:</h5>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs font-mono">
                      <span className="text-blue-600 dark:text-blue-400">{'{YYYY}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{YY}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{MM}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{DD}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{DOTW}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{SHOW}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{EPISODE}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{SEGMENT}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{TIME}'}</span>
                      <span className="text-blue-600 dark:text-blue-400">{'{ANY}'}</span>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Built-in Placeholders:</h5>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs font-mono">
                      <span className="text-gray-600 dark:text-gray-400">{'{showName}'}</span>
                      <span className="text-gray-600 dark:text-gray-400">{'{date}'}</span>
                      <span className="text-gray-600 dark:text-gray-400">{'{timestamp}'}</span>
                      <span className="text-gray-600 dark:text-gray-400">{'{HH}'}</span>
                      <span className="text-gray-600 dark:text-gray-400">{'{mm}'}</span>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date Combinations:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                      <span className="text-green-600 dark:text-green-400">{'{YYYY-MM-DD}'}</span>
                      <span className="text-green-600 dark:text-green-400">{'{YYYYMMDD}'}</span>
                      <span className="text-green-600 dark:text-green-400">{'{MM-DD-YYYY}'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File Naming Tab */}
          {activeTab === 'naming' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Output File Naming</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Output Pattern
                  </label>
                  <input
                    type="text"
                    value={safeFileNamingRules.outputPattern}
                    onChange={(e) => updateFileNamingRule('outputPattern', e.target.value)}
                    placeholder="{showName}_{YYYY}-{MM}-{DD}"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    File extension will be added automatically
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Case Conversion
                  </label>
                  <select
                    value={safeFileNamingRules.caseConversion}
                    onChange={(e) => updateFileNamingRule('caseConversion', e.target.value as FileNamingRules['caseConversion'])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Change</option>
                    <option value="uppercase">UPPERCASE</option>
                    <option value="lowercase">lowercase</option>
                    <option value="titlecase">Title Case</option>
                    <option value="camelcase">camelCase</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invalid Character Handling
                  </label>
                  <select
                    value={safeFileNamingRules.invalidCharacterHandling}
                    onChange={(e) => updateFileNamingRule('invalidCharacterHandling', e.target.value as FileNamingRules['invalidCharacterHandling'])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="remove">Remove</option>
                    <option value="replace">Replace</option>
                    <option value="underscore">Replace with _</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Length (optional)
                  </label>
                  <input
                    type="number"
                    value={safeFileNamingRules.maxLength || ''}
                    onChange={(e) => updateFileNamingRule('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="255"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Preview Examples:
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Pattern:</span>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {safeFileNamingRules.outputPattern || '{SHOW}_{YYYY}-{MM}-{DD}'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Sample outputs:</span>
                    <div className="space-y-1 text-sm font-mono">
                      <p className="text-gray-600 dark:text-gray-400">
                        • {(safeFileNamingRules.outputPattern || '{SHOW}_{YYYY}-{MM}-{DD}')
                          .replace('{SHOW}', 'MorningShow')
                          .replace('{showName}', 'Morning Show')
                          .replace('{YYYY}', '2024')
                          .replace('{YY}', '24')
                          .replace('{MM}', '12')
                          .replace('{DD}', '15')
                          .replace('{DOTW}', 'Monday')
                          .replace('{EPISODE}', 'E001')
                          .replace('{SEGMENT}', 'Weather')
                          .replace('{TIME}', '08:30')
                          .replace('{date}', '2024-12-15')
                          .replace('{HH}', '09')
                          .replace('{mm}', '30')
                          .replace('{YYYY-MM-DD}', '2024-12-15')
                          .replace('{YYYYMMDD}', '20241215')
                        }.mp3
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        • {(safeFileNamingRules.outputPattern || '{SHOW}_{YYYY}-{MM}-{DD}')
                          .replace('{SHOW}', 'cal')
                          .replace('{showName}', 'Calendar Show')
                          .replace('{YYYY}', '2024')
                          .replace('{YY}', '24')
                          .replace('{MM}', '01')
                          .replace('{DD}', '08')
                          .replace('{DOTW}', 'Tuesday')
                          .replace('{EPISODE}', 'E002')
                          .replace('{SEGMENT}', 'News')
                          .replace('{TIME}', '14:45')
                          .replace('{date}', '2024-01-08')
                          .replace('{HH}', '14')
                          .replace('{mm}', '45')
                          .replace('{YYYY-MM-DD}', '2024-01-08')
                          .replace('{YYYYMMDD}', '20240108')
                        }.mp3
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 