import { useState } from 'react'
import { Plus, Trash2, FileText, Tag, Settings2, Copy, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PatternTester } from '@/components/shows/PatternTester'
import type { MetadataMapping, MetadataExtractionRule, FileNamingRules, ShowTemplate } from '@/types/show'
import { BUILT_IN_TEMPLATES } from '@/types/show'

interface MetadataConfigProps {
  metadataMapping: MetadataMapping
  fileNamingRules: FileNamingRules
  onUpdateMapping: (mapping: MetadataMapping) => void
  onUpdateNamingRules: (rules: FileNamingRules) => void
  activeSection?: 'extraction' | 'fields' | 'naming' | 'preview'
}

// Common regex patterns for quick selection
const COMMON_PATTERNS = [
  { 
    name: 'Date with underscores (YYYYMMDD)',
    pattern: '(\\d{8})',
    description: 'Matches dates like 20241215'
  },
  {
    name: 'Date with hyphens (YYYY-MM-DD)',
    pattern: '(\\d{4}-\\d{2}-\\d{2})',
    description: 'Matches dates like 2024-12-15'
  },
  {
    name: 'Show name (word characters)',
    pattern: '([A-Za-z]+)',
    description: 'Matches alphabetic characters'
  },
  {
    name: 'Episode/Segment number',
    pattern: '(\\d+)',
    description: 'Matches numbers'
  },
  {
    name: 'Generic text segment',
    pattern: '([^._-]+)',
    description: 'Matches text until delimiter'
  },
  {
    name: 'File extension',
    pattern: '\\.(mp3|wav|flac|aac)',
    description: 'Matches audio file extensions'
  }
]

// Metadata field suggestions
const METADATA_FIELDS = [
  { key: 'title', label: 'Title', placeholder: '{showName} - {segment}' },
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
  onUpdateNamingRules, 
  activeSection 
}: MetadataConfigProps) {
  const [activeTab, setActiveTab] = useState<'patterns' | 'extraction' | 'metadata' | 'naming' | 'test'>('patterns')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Provide default values if props are undefined
  const safeMetadataMapping: MetadataMapping = metadataMapping || {
    inputPatterns: [''],
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

  // Pattern management
  const addInputPattern = () => {
    const newMapping = {
      ...safeMetadataMapping,
      inputPatterns: [...safeMetadataMapping.inputPatterns, '']
    }
    onUpdateMapping(newMapping)
  }

  const updateInputPattern = (index: number, pattern: string) => {
    const newPatterns = [...safeMetadataMapping.inputPatterns]
    newPatterns[index] = pattern
    onUpdateMapping({
      ...safeMetadataMapping,
      inputPatterns: newPatterns
    })
  }

  const removeInputPattern = (index: number) => {
    const newPatterns = safeMetadataMapping.inputPatterns.filter((_, i) => i !== index)
    onUpdateMapping({
      ...safeMetadataMapping,
      inputPatterns: newPatterns
    })
  }

  // Extraction rules management
  const addExtractionRule = () => {
    const newRule: MetadataExtractionRule = {
      field: 'showName',
      source: 'regex',
      regexGroup: 1
    }
    onUpdateMapping({
      ...safeMetadataMapping,
      extractionRules: [...safeMetadataMapping.extractionRules, newRule]
    })
  }

  const updateExtractionRule = (index: number, rule: MetadataExtractionRule) => {
    const newRules = [...safeMetadataMapping.extractionRules]
    newRules[index] = rule
    onUpdateMapping({
      ...safeMetadataMapping,
      extractionRules: newRules
    })
  }

  const removeExtractionRule = (index: number) => {
    const newRules = safeMetadataMapping.extractionRules.filter((_, i) => i !== index)
    onUpdateMapping({
      ...safeMetadataMapping,
      extractionRules: newRules
    })
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

  // Template loading
  const loadTemplate = (templateId: string) => {
    const template = BUILT_IN_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      onUpdateMapping(template.metadataMapping)
      onUpdateNamingRules(template.fileNamingRules)
      setSelectedTemplate(templateId)
    }
  }

  const insertCommonPattern = (pattern: string, patternIndex: number) => {
    const currentPattern = safeMetadataMapping.inputPatterns[patternIndex] || ''
    const newPattern = currentPattern + pattern
    updateInputPattern(patternIndex, newPattern)
  }

  // Handle tab changes safely
  const handleTabChange = (tabId: string) => {
    const validTabs = ['patterns', 'extraction', 'metadata', 'naming', 'test']
    if (validTabs.includes(tabId)) {
      setActiveTab(tabId as any)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Templates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Load from template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {BUILT_IN_TEMPLATES.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => selectedTemplate && loadTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
                className="w-full"
                type="button"
              >
                Load Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'patterns', label: 'Input Patterns', icon: FileText },
              { id: 'extraction', label: 'Extraction Rules', icon: Settings2 },
              { id: 'metadata', label: 'Metadata Fields', icon: Tag },
              { id: 'naming', label: 'File Naming', icon: Copy },
              { id: 'test', label: 'Test & Preview', icon: BookOpen }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? 'default' : 'outline'}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleTabChange(id)
                }}
                className="flex items-center space-x-2"
                type="button"
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Input Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Input Patterns</h3>
                <Button onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  addInputPattern()
                }} size="sm" type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>

              {safeMetadataMapping.inputPatterns.map((pattern, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pattern {index + 1}
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeInputPattern(index)
                      }}
                      className="text-red-600 hover:text-red-700"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <input
                    type="text"
                    value={pattern}
                    onChange={(e) => updateInputPattern(index, e.target.value)}
                    placeholder="Enter regex pattern..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />

                  {/* Common Pattern Helpers */}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                      Common patterns:
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {COMMON_PATTERNS.map((commonPattern) => (
                        <Button
                          key={commonPattern.name}
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            insertCommonPattern(commonPattern.pattern, index)
                          }}
                          className="text-xs"
                          title={commonPattern.description}
                          type="button"
                        >
                          {commonPattern.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {safeMetadataMapping.inputPatterns.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No input patterns defined. Add a pattern to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Extraction Rules Tab */}
          {activeTab === 'extraction' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Extraction Rules</h3>
                <Button onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  addExtractionRule()
                }} size="sm" type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              {safeMetadataMapping.extractionRules.map((rule, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Field
                    </label>
                    <select
                      value={rule.field}
                      onChange={(e) => updateExtractionRule(index, { 
                        ...rule, 
                        field: e.target.value as MetadataExtractionRule['field'] 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="showName">Show Name</option>
                      <option value="date">Date</option>
                      <option value="episode">Episode</option>
                      <option value="segment">Segment</option>
                      <option value="reporter">Reporter</option>
                      <option value="storyId">Story ID</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Source
                    </label>
                    <select
                      value={rule.source}
                      onChange={(e) => updateExtractionRule(index, { 
                        ...rule, 
                        source: e.target.value as MetadataExtractionRule['source'] 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="regex">Regex Group</option>
                      <option value="filename">Full Filename</option>
                      <option value="directory">Directory</option>
                      <option value="static">Static Value</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {rule.source === 'regex' ? 'Group #' : rule.source === 'static' ? 'Value' : 'Config'}
                    </label>
                    {rule.source === 'regex' ? (
                      <input
                        type="number"
                        value={rule.regexGroup || 1}
                        onChange={(e) => updateExtractionRule(index, { 
                          ...rule, 
                          regexGroup: parseInt(e.target.value) || 1 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                      />
                    ) : rule.source === 'static' ? (
                      <input
                        type="text"
                        value={rule.staticValue || ''}
                        onChange={(e) => updateExtractionRule(index, { 
                          ...rule, 
                          staticValue: e.target.value 
                        })}
                        placeholder="Static value..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="Config..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled
                      />
                    )}
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeExtractionRule(index)
                      }}
                      className="w-full text-red-600 hover:text-red-700"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {safeMetadataMapping.extractionRules.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No extraction rules defined. Add rules to extract data from filenames.</p>
                </div>
              )}
            </div>
          )}

          {/* Metadata Fields Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Output Metadata</h3>
              
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
                      Use placeholders like {'{showName}, {date}, {segment}, {YYYY}, {MM}, {DD}'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Naming Tab */}
          {activeTab === 'naming' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">File Naming Rules</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Output Pattern
                  </label>
                  <input
                    type="text"
                    value={safeFileNamingRules.outputPattern}
                    onChange={(e) => updateFileNamingRule('outputPattern', e.target.value)}
                    placeholder="{ShowName}_{YYYY}-{MM}-{DD}"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
            </div>
          )}

          {/* Test & Preview Tab */}
          {activeTab === 'test' && (
            <PatternTester
              metadataMapping={safeMetadataMapping}
              fileNamingRules={safeFileNamingRules}
              onUpdateMapping={onUpdateMapping}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 