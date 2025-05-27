/**
 * Pattern Parser for File Data Extraction
 * 
 * This utility enables sophisticated data extraction from filenames using bracketed placeholders.
 * 
 * Example Usage:
 * - Pattern: "cal - {DOTW}" matches "cal - mon" and extracts {DOTW: "Monday"}
 * - Pattern: "{SHOW}_{YYYY}_{MM}_{DD}" matches "News_2024_01_15" and extracts date components
 * - Pattern: "{SHOW}_{YY}{MM}{DD}" matches "Talk_240115" with compact date format
 * 
 * Supported Placeholders:
 * - {YYYY}, {YY} - Year (4 or 2 digits)
 * - {MM}, {DD} - Month and day
 * - {DOTW} - Day of week (recognizes Mon=Monday, tue=Tuesday, etc.)
 * - {SHOW}, {EPISODE}, {SEGMENT} - Content identifiers
 * - {TIME} - Time stamps (HH:MM or HH:MM:SS)
 * - {ANY} - Any text content
 * 
 * The extracted data can then be used in file naming patterns for consistent output.
 */

export interface PatternExtraction {
  [key: string]: string | number
}

export interface PatternPlaceholder {
  key: string
  regex: string
  description: string
  examples: string[]
}

// Supported pattern placeholders
export const PATTERN_PLACEHOLDERS: PatternPlaceholder[] = [
  {
    key: 'YYYY',
    regex: '(\\d{4})',
    description: '4-digit year',
    examples: ['2024', '2023', '2025']
  },
  {
    key: 'YY', 
    regex: '(\\d{2})',
    description: '2-digit year',
    examples: ['24', '23', '25']
  },
  {
    key: 'MM',
    regex: '(\\d{1,2})',
    description: 'Month (1-12)',
    examples: ['01', '1', '12']
  },
  {
    key: 'DD',
    regex: '(\\d{1,2})',
    description: 'Day (1-31)',
    examples: ['01', '1', '31']
  },
  {
    key: 'DOTW',
    regex: '((?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday))',
    description: 'Day of the week (full or abbreviated)',
    examples: ['Mon', 'Monday', 'tue', 'Wednesday']
  },
  {
    key: 'SHOW',
    regex: '([^_\\-\\s]+)',
    description: 'Show name (alphanumeric)',
    examples: ['MorningShow', 'News', 'Sports']
  },
  {
    key: 'EPISODE',
    regex: '([^_\\-\\s\\.]+)',
    description: 'Episode identifier',
    examples: ['E001', 'Episode1', 'Part2']
  },
  {
    key: 'SEGMENT',
    regex: '([^_\\-\\s\\.]+)',
    description: 'Segment name',
    examples: ['Weather', 'Sports', 'Interview']
  },
  {
    key: 'TIME',
    regex: '(\\d{1,2}[:\\-]\\d{2}(?:[:\\-]\\d{2})?)',
    description: 'Time (HH:MM or HH:MM:SS)',
    examples: ['08:30', '14:45:30', '9:15']
  },
  {
    key: 'ANY',
    regex: '([^_\\-\\s\\.]+)',
    description: 'Any text (non-whitespace)',
    examples: ['anything', 'text123', 'value']
  }
]

// Day of week mappings for normalization
const DAY_MAPPINGS: Record<string, string> = {
  'mon': 'Monday',
  'monday': 'Monday',
  'tue': 'Tuesday', 
  'tues': 'Tuesday',
  'tuesday': 'Tuesday',
  'wed': 'Wednesday',
  'wednesday': 'Wednesday',
  'thu': 'Thursday',
  'thur': 'Thursday',
  'thurs': 'Thursday',
  'thursday': 'Thursday',
  'fri': 'Friday',
  'friday': 'Friday',
  'sat': 'Saturday',
  'saturday': 'Saturday',
  'sun': 'Sunday',
  'sunday': 'Sunday'
}

/**
 * Convert a pattern with placeholders to a regex pattern
 * Example: "cal - {DOTW}" -> "cal - ((?:mon|tue|...))"
 */
export function patternToRegex(pattern: string): { regex: RegExp; placeholderKeys: string[] } {
  let regexPattern = pattern
  const placeholderKeys: string[] = []
  
  // Sort placeholders by length (longest first) to prevent partial matches
  const sortedPlaceholders = [...PATTERN_PLACEHOLDERS].sort((a, b) => b.key.length - a.key.length)
  
  for (const placeholder of sortedPlaceholders) {
    const placeholderPattern = `{${placeholder.key}}`
    if (regexPattern.includes(placeholderPattern)) {
      regexPattern = regexPattern.replace(
        new RegExp(escapeRegex(placeholderPattern), 'gi'),
        placeholder.regex
      )
      placeholderKeys.push(placeholder.key)
    }
  }
  
  // Escape other regex characters but preserve our capture groups
  regexPattern = escapeRegex(regexPattern)
  
  // Restore capture groups
  for (const placeholder of sortedPlaceholders) {
    const escapedRegex = escapeRegex(placeholder.regex)
    regexPattern = regexPattern.replace(
      new RegExp(escapedRegex, 'g'),
      placeholder.regex
    )
  }
  
  // Make case-insensitive for DOTW matching
  const flags = placeholderKeys.includes('DOTW') ? 'i' : ''
  
  return {
    regex: new RegExp(`^${regexPattern}$`, flags),
    placeholderKeys
  }
}

/**
 * Extract data from a filename using a pattern
 */
export function extractDataFromFilename(
  filename: string, 
  pattern: string
): { success: boolean; data: PatternExtraction; confidence: number } {
  try {
    const { regex, placeholderKeys } = patternToRegex(pattern)
    const match = filename.match(regex)
    
    if (!match) {
      return { success: false, data: {}, confidence: 0 }
    }
    
    const data: PatternExtraction = {}
    
    // Extract captured groups
    for (let i = 0; i < placeholderKeys.length; i++) {
      const key = placeholderKeys[i]
      const value = match[i + 1] // +1 because match[0] is the full match
      
      if (value) {
        data[key] = normalizeExtractedValue(key, value)
      }
    }
    
    // Calculate confidence based on how much of the filename was matched
    const matchedLength = match[0].length
    const confidence = Math.round((matchedLength / filename.length) * 100)
    
    return { success: true, data, confidence }
  } catch (error) {
    console.error('Pattern extraction error:', error)
    return { success: false, data: {}, confidence: 0 }
  }
}

/**
 * Normalize extracted values (e.g., convert day abbreviations to full names)
 */
function normalizeExtractedValue(key: string, value: string): string | number {
  switch (key) {
    case 'DOTW':
      return DAY_MAPPINGS[value.toLowerCase()] || value
    case 'YYYY':
    case 'YY':
    case 'MM':
    case 'DD':
      return parseInt(value, 10)
    case 'TIME':
      // Keep time as string but could parse to time object if needed
      return value
    default:
      return value
  }
}

/**
 * Generate a preview filename using extracted data and naming rules
 */
export function generatePreviewFilename(
  extractedData: PatternExtraction,
  namingPattern: string,
  originalExtension: string = '.mp3'
): string {
  let result = namingPattern
  
  // Replace placeholders with extracted data
  Object.entries(extractedData).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    result = result.replace(new RegExp(escapeRegex(placeholder), 'gi'), String(value))
  })
  
  // Handle date formatting if we have date components
  if (extractedData.YYYY || extractedData.YY) {
    const year = extractedData.YYYY || (2000 + Number(extractedData.YY || 0))
    const month = extractedData.MM || 1
    const day = extractedData.DD || 1
    
    // Support common date placeholders
    result = result.replace(/{YYYY}/g, String(year))
    result = result.replace(/{MM}/g, String(month).padStart(2, '0'))
    result = result.replace(/{DD}/g, String(day).padStart(2, '0'))
    result = result.replace(/{YYYY-MM-DD}/g, `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    result = result.replace(/{YYYYMMDD}/g, `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`)
  }
  
  // Clean up any remaining placeholders
  result = result.replace(/{[^}]+}/g, '')
  
  // Clean up multiple separators
  result = result.replace(/[_\-\s]+/g, '_')
  result = result.replace(/^[_\-\s]+|[_\-\s]+$/g, '')
  
  return result + originalExtension
}

/**
 * Test a pattern against multiple filenames
 */
export function testPattern(
  pattern: string, 
  testFilenames: string[]
): Array<{
  filename: string
  matches: boolean
  extractedData: PatternExtraction
  confidence: number
  errors: string[]
}> {
  return testFilenames.map(filename => {
    try {
      const result = extractDataFromFilename(filename, pattern)
      return {
        filename,
        matches: result.success,
        extractedData: result.data,
        confidence: result.confidence,
        errors: []
      }
    } catch (error) {
      return {
        filename,
        matches: false,
        extractedData: {},
        confidence: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  })
}

/**
 * Get example patterns for different use cases
 */
export function getExamplePatterns(): Array<{
  name: string
  pattern: string
  description: string
  exampleFiles: string[]
}> {
  return [
    {
      name: 'Daily Show with Day of Week',
      pattern: 'cal - {DOTW}',
      description: 'Matches shows with day of week abbreviations',
      exampleFiles: ['cal - mon', 'cal - tue', 'cal - wednesday']
    },
    {
      name: 'Date-based Show',
      pattern: '{SHOW}_{YYYY}_{MM}_{DD}',
      description: 'Show with full date components',
      exampleFiles: ['MorningNews_2024_01_15', 'Sports_2024_12_31']
    },
    {
      name: 'Short Date Format',
      pattern: '{SHOW}_{YY}{MM}{DD}',
      description: 'Compact date format',
      exampleFiles: ['News_240115', 'Talk_241231']
    },
    {
      name: 'Episode-based',
      pattern: '{SHOW}_Episode_{EPISODE}',
      description: 'Episodic content',
      exampleFiles: ['Podcast_Episode_001', 'Drama_Episode_S01E05']
    },
    {
      name: 'Time-stamped',
      pattern: '{SHOW}_{YYYY}-{MM}-{DD}_{TIME}',
      description: 'Date and time stamps',
      exampleFiles: ['LiveShow_2024-01-15_08:30', 'News_2024-12-25_14:45:30']
    }
  ]
}

/**
 * Validate a pattern for common issues
 */
export function validatePattern(pattern: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!pattern.trim()) {
    errors.push('Pattern cannot be empty')
    return { valid: false, errors, warnings }
  }
  
  // Check for valid placeholders
  const placeholderMatches = pattern.match(/{[^}]+}/g) || []
  const validPlaceholders = PATTERN_PLACEHOLDERS.map(p => p.key)
  
  for (const match of placeholderMatches) {
    const placeholder = match.slice(1, -1) // Remove { }
    if (!validPlaceholders.includes(placeholder)) {
      errors.push(`Unknown placeholder: ${match}. Valid placeholders: ${validPlaceholders.map(p => `{${p}}`).join(', ')}`)
    }
  }
  
  // Check for potential issues
  if (!placeholderMatches.length) {
    warnings.push('Pattern has no placeholders - it will match literally')
  }
  
  if (pattern.includes('*')) {
    warnings.push('Wildcards (*) are not supported in extraction patterns. Use placeholders like {ANY} instead.')
  }
  
  try {
    patternToRegex(pattern)
  } catch (error) {
    errors.push(`Invalid pattern: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
} 