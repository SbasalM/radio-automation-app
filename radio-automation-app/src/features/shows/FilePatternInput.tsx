import { useState } from 'react'
import { Trash2, Plus, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FilePattern } from '@/types/show'

interface FilePatternInputProps {
  patterns: FilePattern[]
  onChange: (patterns: FilePattern[]) => void
}

export function FilePatternInput({ patterns, onChange }: FilePatternInputProps) {
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

  const examplePatterns = [
    'ShowName_*.mp3 - Matches: ShowName_Episode1.mp3, ShowName_Today.mp3',
    'News_*_*.wav - Matches: News_Morning_Jan15.wav, News_Evening_Today.wav',
    '*.* - Matches all files (use carefully)',
    'Morning*.mp3 - Matches: Morning_Show.mp3, MorningNews.mp3'
  ]

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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Pattern Examples:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            {examplePatterns.map((example, index) => (
              <li key={index} className="font-mono">
                {example}
              </li>
            ))}
          </ul>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            Use * as wildcard to match any characters. Be specific to avoid processing unwanted files.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {patterns.map((pattern, index) => (
          <div key={pattern.id} className="flex items-center space-x-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="e.g., ShowName_*.mp3"
                value={pattern.pattern}
                onChange={(e) => updatePattern(pattern.id, { pattern: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="w-32">
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