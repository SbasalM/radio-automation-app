import { useState, useEffect } from 'react'
import { TestTube, AlertTriangle, CheckCircle, Copy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PatternTestResult, MetadataMapping, FileNamingRules } from '@/types/show'

interface PatternTesterProps {
  metadataMapping: MetadataMapping
  fileNamingRules: FileNamingRules
  onUpdateMapping?: (mapping: MetadataMapping) => void
}

// Sample filenames for testing common patterns
const SAMPLE_FILENAMES = [
  'MorningShow_20241215_Weather.mp3',
  'morning-2024-12-15-traffic.wav',
  'news-johnson-123.wav',
  'News_20241215_Smith_Story001.mp3',
  'SportsUpdate_2024_12_15_Football.mp3',
  'weekend_sports_basketball_highlights.wav',
  'talk_show_interview_guest_name.mp3',
  'commercial_break_segment_01.wav',
  'music_hour_classical_selection.mp3',
  'weather_update_evening_forecast.wav'
]

export function PatternTester({ metadataMapping, fileNamingRules, onUpdateMapping }: PatternTesterProps) {
  const [testFilename, setTestFilename] = useState('')
  const [testResults, setTestResults] = useState<PatternTestResult[]>([])
  const [selectedResult, setSelectedResult] = useState<PatternTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Test filename against all patterns
  const testPatterns = async (filename: string) => {
    if (!filename.trim()) {
      setTestResults([])
      setSelectedResult(null)
      return
    }

    setIsLoading(true)
    
    try {
      const results: PatternTestResult[] = []
      
      for (const pattern of metadataMapping.inputPatterns) {
        const result = testSinglePattern(pattern, filename)
        results.push(result)
      }
      
      setTestResults(results)
      
      // Auto-select the best match
      const bestMatch = results.find(r => r.matches && r.confidence > 0.8) || results[0]
      setSelectedResult(bestMatch)
      
    } catch (error) {
      console.error('Error testing patterns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testSinglePattern = (pattern: string, filename: string): PatternTestResult => {
    try {
      const regex = new RegExp(pattern, 'i')
      const match = filename.match(regex)
      
      if (!match) {
        return {
          pattern,
          filename,
          matches: false,
          extractedData: {},
          previewFilename: filename,
          previewMetadata: {},
          warnings: ['Pattern does not match filename'],
          confidence: 0
        }
      }

      // Extract data based on extraction rules
      const extractedData: Record<string, any> = {}
      const warnings: string[] = []
      let confidence = 0.9

      for (const rule of metadataMapping.extractionRules) {
        if (rule.source === 'regex' && rule.regexGroup !== undefined) {
          const value = match[rule.regexGroup]
          if (value) {
            if (rule.field === 'date' && rule.dateFormat) {
              try {
                const parsedDate = parseDate(value, rule.dateFormat)
                extractedData[rule.field] = parsedDate
                extractedData.dateComponents = getDateComponents(parsedDate)
              } catch (error) {
                warnings.push(`Failed to parse date "${value}" with format "${rule.dateFormat}"`)
                extractedData[rule.field] = value
                confidence -= 0.1
              }
            } else {
              extractedData[rule.field] = value
            }
          } else {
            if (rule.fallbackValue) {
              extractedData[rule.field] = rule.fallbackValue
              warnings.push(`Using fallback value for ${rule.field}`)
              confidence -= 0.05
            } else {
              warnings.push(`No value extracted for ${rule.field}`)
              confidence -= 0.1
            }
          }
        } else if (rule.source === 'static' && rule.staticValue) {
          extractedData[rule.field] = rule.staticValue
        }
      }

      // Generate preview filename
      const previewFilename = generateFilename(fileNamingRules, extractedData, filename)
      
      // Generate preview metadata
      const previewMetadata = generateMetadata(metadataMapping.outputMetadata, extractedData)

      return {
        pattern,
        filename,
        matches: true,
        extractedData,
        previewFilename,
        previewMetadata,
        warnings,
        confidence: Math.max(0, Math.min(1, confidence))
      }
      
    } catch (error) {
      return {
        pattern,
        filename,
        matches: false,
        extractedData: {},
        previewFilename: filename,
        previewMetadata: {},
        warnings: [`Pattern error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        confidence: 0
      }
    }
  }

  const parseDate = (dateString: string, format: string): Date => {
    // Simple date parsing - in production would use a proper date library
    if (format === 'YYYYMMDD' && dateString.length === 8) {
      const year = parseInt(dateString.substr(0, 4))
      const month = parseInt(dateString.substr(4, 2)) - 1
      const day = parseInt(dateString.substr(6, 2))
      return new Date(year, month, day)
    }
    
    // Add more date format parsing as needed
    throw new Error(`Unsupported date format: ${format}`)
  }

  const getDateComponents = (date: Date) => ({
    YYYY: date.getFullYear().toString(),
    MM: (date.getMonth() + 1).toString().padStart(2, '0'),
    DD: date.getDate().toString().padStart(2, '0'),
    YY: date.getFullYear().toString().substr(2, 2)
  })

  const generateFilename = (rules: FileNamingRules, data: Record<string, any>, original: string): string => {
    let filename = rules.outputPattern

    // Replace placeholders
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      filename = filename.replace(new RegExp(placeholder, 'g'), value?.toString() || '')
    })

    // Replace date components if available
    if (data.dateComponents) {
      Object.entries(data.dateComponents).forEach(([key, value]) => {
        const placeholder = `{${key}}`
        filename = filename.replace(new RegExp(placeholder, 'g'), value as string)
      })
    }

    // Apply case conversion
    switch (rules.caseConversion) {
      case 'uppercase':
        filename = filename.toUpperCase()
        break
      case 'lowercase':
        filename = filename.toLowerCase()
        break
      case 'titlecase':
        filename = filename.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
        break
    }

    // Handle invalid characters
    switch (rules.invalidCharacterHandling) {
      case 'remove':
        filename = filename.replace(/[<>:"/\\|?*]/g, '')
        break
      case 'replace':
      case 'underscore':
        const replacement = rules.replacementCharacter || '_'
        filename = filename.replace(/[<>:"/\\|?*]/g, replacement)
        break
    }

    // Apply length limit
    if (rules.maxLength && filename.length > rules.maxLength) {
      const ext = original.split('.').pop()
      const maxBase = rules.maxLength - (ext ? ext.length + 1 : 0)
      filename = filename.substr(0, maxBase) + (ext ? `.${ext}` : '')
    }

    // Ensure we have a file extension
    if (!filename.includes('.') && original.includes('.')) {
      const ext = original.split('.').pop()
      filename += `.${ext}`
    }

    return filename
  }

  const generateMetadata = (template: any, data: Record<string, any>): Record<string, any> => {
    const metadata: Record<string, any> = {}

    Object.entries(template).forEach(([key, value]) => {
      if (typeof value === 'string') {
        let processedValue = value
        
        // Replace placeholders
        Object.entries(data).forEach(([dataKey, dataValue]) => {
          const placeholder = `{${dataKey}}`
          processedValue = processedValue.replace(new RegExp(placeholder, 'g'), dataValue?.toString() || '')
        })

        // Replace date components
        if (data.dateComponents) {
          Object.entries(data.dateComponents).forEach(([dateKey, dateValue]) => {
            const placeholder = `{${dateKey}}`
            processedValue = processedValue.replace(new RegExp(placeholder, 'g'), dateValue as string)
          })
        }

        metadata[key] = processedValue
      } else {
        metadata[key] = value
      }
    })

    return metadata
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const loadSampleFilename = (filename: string) => {
    setTestFilename(filename)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      testPatterns(testFilename)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [testFilename, metadataMapping, fileNamingRules])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5" />
            <span>Pattern Tester</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Filename
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={testFilename}
                onChange={(e) => setTestFilename(e.target.value)}
                placeholder="Enter a filename to test patterns..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                variant="outline"
                onClick={() => testPatterns(testFilename)}
                disabled={isLoading}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Sample Filenames */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or try a sample filename:
            </label>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_FILENAMES.map((filename) => (
                <Button
                  key={filename}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleFilename(filename)}
                  className="text-xs"
                >
                  {filename}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pattern Matches */}
          <Card>
            <CardHeader>
              <CardTitle>Pattern Matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedResult === result
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : result.matches
                        ? 'border-green-200 hover:border-green-300 dark:border-green-800'
                        : 'border-red-200 dark:border-red-800'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {result.pattern}
                    </code>
                    <div className="flex items-center space-x-2">
                      {result.matches ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  
                  {result.warnings.length > 0 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {result.warnings.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Result Details */}
          {selectedResult && (
            <Card>
              <CardHeader>
                <CardTitle>Extraction Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Extracted Data */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Extracted Data
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    {Object.keys(selectedResult.extractedData).length > 0 ? (
                      Object.entries(selectedResult.extractedData).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {typeof value === 'object' ? JSON.stringify(value) : value?.toString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No data extracted</span>
                    )}
                  </div>
                </div>

                {/* Preview Filename */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview Filename
                  </h4>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded text-sm">
                      {selectedResult.previewFilename}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedResult.previewFilename)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Preview Metadata */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview Metadata
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    {Object.keys(selectedResult.previewMetadata).length > 0 ? (
                      Object.entries(selectedResult.previewMetadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {value?.toString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No metadata generated</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
} 