import { useState } from 'react'
import { Trash2, Plus, HelpCircle, CheckCircle2, AlertCircle, Info, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FilePattern, FileNamingRules } from '@/types/show'
import { 
  PATTERN_PLACEHOLDERS, 
  getExamplePatterns, 
  validatePattern,
  extractDataFromFilename,
  generatePreviewFilename
} from '@/utils/pattern-parser'

interface FilePatternInputProps {
  patterns: FilePattern[]
  onChange: (patterns: FilePattern[]) => void
  fileNamingRules?: FileNamingRules
}

export function FilePatternInput({ patterns, onChange, fileNamingRules }: FilePatternInputProps) {
  const [showHelp, setShowHelp] = useState(false)

  const addPattern = () => {
    const newPattern: FilePattern = {
      id: Date.now().toString(),
      pattern: '',
      type: 'watch'
    }
    onChange([...patterns, newPattern])
  }

  const removePattern = (id: string) => {
    onChange(patterns.filter(p => p.id !== id))
  }

  const updatePattern = (id: string, updates: Partial<FilePattern>) => {
    onChange(patterns.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  // Auto-detect if pattern has extraction placeholders
  const hasExtractionPlaceholders = (pattern: string): boolean => {
    return /{[^}]+}/.test(pattern)
  }

  // Get pattern type description
  const getPatternTypeInfo = (pattern: string): { type: string; color: string; description: string } => {
    if (!pattern.trim()) {
      return { type: 'Empty', color: 'text-gray-500', description: 'Enter a pattern' }
    }
    
    const hasPlaceholders = hasExtractionPlaceholders(pattern)
    const hasWildcards = pattern.includes('*')
    
    if (hasPlaceholders && hasWildcards) {
      return { 
        type: 'Mixed', 
        color: 'text-purple-600', 
        description: 'File matching + data extraction' 
      }
    } else if (hasPlaceholders) {
      return { 
        type: 'Smart', 
        color: 'text-green-600', 
        description: 'File matching + data extraction' 
      }
    } else if (hasWildcards) {
      return { 
        type: 'Basic', 
        color: 'text-blue-600', 
        description: 'File matching only' 
      }
    } else {
      return { 
        type: 'Literal', 
        color: 'text-orange-600', 
        description: 'Exact filename match' 
      }
    }
  }

  // Generate enhanced preview examples
  const generatePreviewExamples = (pattern: string) => {
    if (!hasExtractionPlaceholders(pattern)) {
      return []
    }

    const today = new Date()
    const currentDate = {
      YYYY: today.getFullYear(),
      YY: (today.getFullYear() % 100).toString().padStart(2, '0'),
      MM: (today.getMonth() + 1).toString().padStart(2, '0'),
      DD: today.getDate().toString().padStart(2, '0'),
      DOTW: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]
    }

    const examples = []
    
    // Example 1: Current day of week
    if (pattern.includes('{DOTW}')) {
      const todayShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today.getDay()]
      let testFilename = pattern
        .replace(/\{DOTW\}/gi, todayShort)
        .replace(/\{SHOW\}/gi, 'MyShow')
        .replace(/\{EPISODE\}/gi, 'E001')
        .replace(/\{SEGMENT\}/gi, 'News')
        .replace(/\{TIME\}/gi, '09:30')
        .replace(/\{ANY\}/gi, 'content')
        .replace(/\{YYYY\}/gi, currentDate.YYYY.toString())
        .replace(/\{YY\}/gi, currentDate.YY)
        .replace(/\{MM\}/gi, currentDate.MM)
        .replace(/\{DD\}/gi, currentDate.DD)

      examples.push({
        filename: testFilename,
        description: `Today (${currentDate.DOTW})`
      })
    }

    // Example 2: Current date
    if (pattern.includes('{YYYY}') || pattern.includes('{YY}') || pattern.includes('{MM}') || pattern.includes('{DD}')) {
      let testFilename = pattern
        .replace(/\{YYYY\}/gi, currentDate.YYYY.toString())
        .replace(/\{YY\}/gi, currentDate.YY)
        .replace(/\{MM\}/gi, currentDate.MM)
        .replace(/\{DD\}/gi, currentDate.DD)
        .replace(/\{SHOW\}/gi, 'MyShow')
        .replace(/\{EPISODE\}/gi, 'E001')
        .replace(/\{SEGMENT\}/gi, 'News')
        .replace(/\{TIME\}/gi, '09:30')
        .replace(/\{ANY\}/gi, 'content')
        .replace(/\{DOTW\}/gi, 'mon')

      examples.push({
        filename: testFilename,
        description: `Current date (${currentDate.YYYY}-${currentDate.MM}-${currentDate.DD})`
      })
    }

    // Example 3: Generic show example (if no date/dotw patterns)
    if (examples.length === 0) {
      let testFilename = pattern
        .replace(/\{SHOW\}/gi, 'MyShow')
        .replace(/\{EPISODE\}/gi, 'E001')
        .replace(/\{SEGMENT\}/gi, 'News')
        .replace(/\{TIME\}/gi, '09:30')
        .replace(/\{ANY\}/gi, 'content')

      examples.push({
        filename: testFilename,
        description: 'Example'
      })
    }

    return examples.slice(0, 2) // Return up to 2 examples
  }

  // Handle directory selection for watch folders
  const handleSelectWatchDirectory = async (patternId: string) => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-ignore - showDirectoryPicker is not in TypeScript types yet
        const dirHandle = await window.showDirectoryPicker()
        
        // Try to get the full path if possible, otherwise use the name as fallback
        let fullPath = dirHandle.name
        try {
          // Try to resolve the full path (this may not work in all browsers)
          if (dirHandle.resolve) {
            const pathSegments = await dirHandle.resolve()
            if (pathSegments && pathSegments.length > 0) {
              fullPath = pathSegments.join('/')
            }
          }
        } catch (pathError) {
          console.log('Could not resolve full path, using directory name:', dirHandle.name)
        }
        
        updatePattern(patternId, { watchPath: fullPath })
      } else {
        // Fallback for browsers that don't support the File System Access API
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            // Get the full relative path and extract the directory
            const firstFile = files[0]
            const pathParts = firstFile.webkitRelativePath.split('/')
            const directoryName = pathParts[0]
            
            // For better UX, we could try to get a more complete path
            // but for now, use the directory name as selected
            updatePattern(patternId, { watchPath: directoryName })
          }
        }
        input.click()
      }
    } catch (error) {
      console.log('Directory selection cancelled or not supported')
    }
  }

  const examplePatterns = getExamplePatterns()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          File Patterns
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(!showHelp)}
          className="h-6 w-6 p-0"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {showHelp && (
        <div className="space-y-4">
          {/* Explanation Card */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
                How Patterns Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="mb-2">Patterns serve two purposes:</p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    <div>
                      <strong>File Matching:</strong> Identify which files to process
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    <div>
                      <strong>Data Extraction:</strong> Pull information from filenames for renaming
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pattern Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Patterns */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
                  Basic Matching (Wildcards)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <div className="font-mono">*.mp3 → Any MP3 file</div>
                  <div className="font-mono">cal*.mp3 → cal_mon.mp3, cal_tue.mp3</div>
                  <div className="font-mono">News_*_*.wav → News_Morning_Jan15.wav</div>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Use * to match any characters
                </p>
              </CardContent>
            </Card>

            {/* Smart Patterns */}
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-900 dark:text-green-100">
                  Smart Patterns (Data Extraction)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <div className="font-mono">cal - {'{DOTW}'} → cal - mon</div>
                  <div className="font-mono">{'{SHOW}_{YYYY}_{MM}_{DD}'} → News_2024_01_15</div>
                  <div className="font-mono">{'{SHOW}_{YY}{MM}{DD}'} → Talk_240115</div>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Use {'{placeholders}'} to extract data
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Available Placeholders */}
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-900 dark:text-purple-100">
                Available Placeholders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {PATTERN_PLACEHOLDERS.slice(0, 8).map(placeholder => (
                  <div key={placeholder.key} className="space-y-1">
                    <div className="font-mono text-purple-800 dark:text-purple-200">
                      {`{${placeholder.key}}`}
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-300">
                      {placeholder.description}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Examples */}
          <Card className="bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-900 dark:text-gray-100">
                Example Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {examplePatterns.slice(0, 3).map((example, index) => (
                  <div key={index} className="space-y-1">
                    <div className="font-mono text-gray-800 dark:text-gray-200">
                      {example.pattern}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {example.description} → {example.exampleFiles[0]}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {patterns.map((pattern, index) => (
          <Card key={pattern.id} className="p-4">
            <div className="space-y-4">
              {/* Pattern Input */}
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Pattern
                    </label>
                    {pattern.pattern && (
                      <div className="flex items-center space-x-1">
                        <Info className="h-3 w-3 text-gray-400" />
                        <span className={`text-xs font-medium ${getPatternTypeInfo(pattern.pattern).color}`}>
                          {getPatternTypeInfo(pattern.pattern).type}
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g., cal - {DOTW} or ShowName_*.mp3"
                    value={pattern.pattern}
                    onChange={(e) => updatePattern(pattern.id, { pattern: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {pattern.pattern && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {getPatternTypeInfo(pattern.pattern).description}
                    </p>
                  )}
                </div>
                <div className="w-44">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Source
                  </label>
                  <select
                    value={pattern.type}
                    onChange={(e) => updatePattern(pattern.id, { type: e.target.value as 'ftp' | 'watch' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="watch">Watch Folder</option>
                    <option value="ftp">FTP</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePattern(pattern.id)}
                  className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  disabled={patterns.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Watch Folder Path */}
              {pattern.type === 'watch' && (
                <div className="space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Watch Folder Path (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., C:\Radio\Incoming\MyShow or leave blank for global setting"
                        value={pattern.watchPath || ''}
                        onChange={(e) => updatePattern(pattern.id, { watchPath: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectWatchDirectory(pattern.id)}
                      className="h-9"
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Browse
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If not specified, the global watch folder setting will be used. <br />
                    <strong>Note:</strong> The Browse button may only show the folder name for security reasons. You can manually enter the full path (e.g., C:\Radio\Shows\MyShow).
                  </p>
                </div>
              )}

              {/* Enhanced Preview for Smart Patterns */}
              {pattern.pattern && hasExtractionPlaceholders(pattern.pattern) && (
                <div className="space-y-3 pl-6 border-l-2 border-green-200 dark:border-green-800">
                  <div className="text-xs font-medium text-green-700 dark:text-green-300">
                    Smart Pattern Detected - Data extraction enabled
                  </div>

                  {/* Pattern Validation */}
                  <div className="text-xs">
                    {(() => {
                      const validation = validatePattern(pattern.pattern)
                      return (
                        <div className="space-y-1">
                          {validation.errors.map((error, i) => (
                            <div key={i} className="flex items-center text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {error}
                            </div>
                          ))}
                          {validation.warnings.map((warning, i) => (
                            <div key={i} className="flex items-center text-yellow-600 dark:text-yellow-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {warning}
                            </div>
                          ))}
                          {validation.valid && validation.errors.length === 0 && (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Pattern is valid
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Enhanced Preview */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs space-y-2">
                    <div className="font-medium text-gray-700 dark:text-gray-300">Preview Examples:</div>
                    {(() => {
                      const examples = generatePreviewExamples(pattern.pattern)
                      
                      return examples.map((example, idx) => {
                        const testResult = extractDataFromFilename(example.filename, pattern.pattern)
                        if (testResult.success) {
                          // Use actual file naming rules if provided, otherwise use a default
                          const outputPattern = fileNamingRules?.outputPattern || '{SHOW}_{DOTW}_{YYYY}-{MM}-{DD}'
                          const outputFilename = generatePreviewFilename(testResult.data, outputPattern, '.mp3')
                          
                          return (
                            <div key={idx} className="space-y-1 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                              <div className="text-xs text-gray-500 dark:text-gray-400">{example.description}:</div>
                              <div className="font-mono text-gray-600 dark:text-gray-400">
                                Input: "{example.filename}"
                              </div>
                              <div className="font-mono text-gray-600 dark:text-gray-400">
                                Extracted: {JSON.stringify(testResult.data)}
                              </div>
                              <div className="font-mono text-green-600 dark:text-green-400">
                                Output: "{outputFilename}"
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={idx} className="text-gray-500">
                            "{example.filename}" - No match with pattern
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPattern}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Pattern
      </Button>

    </div>
  )
} 