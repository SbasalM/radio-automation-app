import { AudioLines, Volume2, Zap, Sliders, Info, Settings, Eye, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settings-store'
import { useShowStore } from '@/store/show-store'
import { useState } from 'react'

export function ProcessingSettings() {
  const { settings, updateProcessingDefaults } = useSettingsStore()
  const { shows } = useShowStore()
  const { processing } = settings
  const [showGlobalUsage, setShowGlobalUsage] = useState(false)

  // Calculate show statistics
  const showsUsingGlobal = shows.filter(show => show.processingOptions.useGlobalSettings)
  const showsUsingCustom = shows.filter(show => !show.processingOptions.useGlobalSettings)

  return (
    <div className="space-y-6">
      {/* Global Settings Info */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-100">Global Audio Processing Settings</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGlobalUsage(!showGlobalUsage)}
              className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800/20"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showGlobalUsage ? 'Hide' : 'Show'} Usage
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-800 dark:text-blue-200 text-sm space-y-2">
            <p>
              These are the default audio processing settings that apply to all shows unless overridden at the show level.
            </p>
            <div className="flex items-center justify-between bg-white dark:bg-blue-900/20 rounded-lg p-3 mt-3">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Shows using global settings:</span>
                  <span className="bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                    {showsUsingGlobal.length}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium">Shows with custom settings:</span>
                  <span className="bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs font-medium">
                    {showsUsingCustom.length}
                  </span>
                </div>
              </div>
            </div>

            {showGlobalUsage && (
              <div className="mt-4 space-y-3">
                {showsUsingGlobal.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Shows Using Global Settings ({showsUsingGlobal.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {showsUsingGlobal.map(show => (
                        <div key={show.id} className="bg-white dark:bg-blue-900/20 rounded px-3 py-2 text-sm">
                          <div className="font-medium text-blue-900 dark:text-blue-100">{show.name}</div>
                          <div className="text-blue-600 dark:text-blue-300 text-xs">
                            {show.enabled ? 'Active' : 'Disabled'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showsUsingCustom.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Shows With Custom Settings ({showsUsingCustom.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {showsUsingCustom.map(show => (
                        <div key={show.id} className="bg-purple-50 dark:bg-purple-900/20 rounded px-3 py-2 text-sm border border-purple-200 dark:border-purple-700">
                          <div className="font-medium text-purple-900 dark:text-purple-100">{show.name}</div>
                          <div className="text-purple-600 dark:text-purple-300 text-xs">
                            Custom audio processing • {show.enabled ? 'Active' : 'Disabled'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mt-3">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Note:</strong> Changes to these global settings will only affect shows that have "Use Global Audio Settings" enabled. 
                    Shows with custom settings will continue using their own audio processing configuration.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio Format Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AudioLines className="h-5 w-5" />
            <span>Output Format</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Audio Format
              </label>
              <select
                value={processing.audioFormat}
                onChange={(e) => updateProcessingDefaults({ audioFormat: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mp3">MP3 (Compressed)</option>
                <option value="wav">WAV (Uncompressed)</option>
                <option value="flac">FLAC (Lossless)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Default format for processed audio files
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sample Rate (Hz)
              </label>
              <select
                value={processing.sampleRate}
                onChange={(e) => updateProcessingDefaults({ sampleRate: parseInt(e.target.value) as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="44100">44.1 kHz (CD Quality)</option>
                <option value="48000">48 kHz (Professional)</option>
                <option value="96000">96 kHz (High Resolution)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Audio sample rate for output files
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MP3 Bit Rate (kbps)
              </label>
              <select
                value={processing.bitRate}
                onChange={(e) => updateProcessingDefaults({ bitRate: parseInt(e.target.value) as any })}
                disabled={processing.audioFormat !== 'mp3'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="128">128 kbps (Standard)</option>
                <option value="192">192 kbps (Good)</option>
                <option value="256">256 kbps (High)</option>
                <option value="320">320 kbps (Maximum)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {processing.audioFormat !== 'mp3' ? 'Only for MP3 format' : 'Quality vs file size'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Normalization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Audio Normalization</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Normalization Level (LUFS)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="-30"
                  max="-12"
                  step="1"
                  value={processing.normalizationLevel}
                  onChange={(e) => updateProcessingDefaults({ normalizationLevel: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>-30 LUFS</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {processing.normalizationLevel} LUFS
                  </span>
                  <span>-12 LUFS</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target loudness level (-23 LUFS recommended for broadcast)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-auto-gain"
                  checked={processing.enableAutoGain}
                  onChange={(e) => updateProcessingDefaults({ enableAutoGain: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enable-auto-gain" className="text-sm text-gray-700 dark:text-gray-300">
                  Enable automatic gain control
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                Automatically adjust levels to target LUFS
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Silence Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Silence Detection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-trim-silence"
              checked={processing.autoTrimSilence}
              onChange={(e) => updateProcessingDefaults({ autoTrimSilence: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="auto-trim-silence" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Automatically trim silence from start and end
            </label>
          </div>

          {processing.autoTrimSilence && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Silence Threshold (dB)
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="-80"
                    max="-20"
                    step="5"
                    value={processing.silenceThreshold}
                    onChange={(e) => updateProcessingDefaults({ silenceThreshold: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>-80 dB</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {processing.silenceThreshold} dB
                    </span>
                    <span>-20 dB</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Audio below this level is considered silence
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Trim Padding (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={processing.defaultTrimPadding}
                  onChange={(e) => updateProcessingDefaults({ defaultTrimPadding: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave this much padding before/after content
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fade Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sliders className="h-5 w-5" />
            <span>Fade In/Out</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Fade In (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={processing.defaultFadeIn}
                onChange={(e) => updateProcessingDefaults({ defaultFadeIn: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Duration of fade in effect
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Fade Out (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={processing.defaultFadeOut}
                onChange={(e) => updateProcessingDefaults({ defaultFadeOut: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Duration of fade out effect
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compression & Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Dynamics Processing</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Compression Ratio
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={processing.compressionRatio}
                  onChange={(e) => updateProcessingDefaults({ compressionRatio: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>1:1 (Off)</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {processing.compressionRatio}:1
                  </span>
                  <span>10:1 (Heavy)</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Dynamic range compression (3:1 recommended)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Limiter Threshold (dB)
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="-6"
                  max="0"
                  step="0.5"
                  value={processing.limiterThreshold}
                  onChange={(e) => updateProcessingDefaults({ limiterThreshold: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>-6 dB</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {processing.limiterThreshold} dB
                  </span>
                  <span>0 dB</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Peak limiting to prevent clipping
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Global Processing Chain Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Processing Chain (for shows using global settings):</strong>
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {processing.autoTrimSilence && (
                <div className="text-gray-700 dark:text-gray-300">
                  1. Trim silence (threshold: {processing.silenceThreshold} dB, padding: {processing.defaultTrimPadding}s)
                </div>
              )}
              <div className="text-gray-700 dark:text-gray-300">
                {processing.autoTrimSilence ? '2' : '1'}. Apply fade in ({processing.defaultFadeIn}s) and fade out ({processing.defaultFadeOut}s)
              </div>
              {processing.enableAutoGain && (
                <div className="text-gray-700 dark:text-gray-300">
                  {processing.autoTrimSilence ? '3' : '2'}. Normalize to {processing.normalizationLevel} LUFS
                </div>
              )}
              <div className="text-gray-700 dark:text-gray-300">
                {(processing.autoTrimSilence ? 3 : 2) + (processing.enableAutoGain ? 1 : 0)}. Apply compression ({processing.compressionRatio}:1) and limiting ({processing.limiterThreshold} dB)
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                {(processing.autoTrimSilence ? 4 : 3) + (processing.enableAutoGain ? 1 : 0)}. Export as {processing.audioFormat.toUpperCase()} 
                ({processing.sampleRate / 1000} kHz{processing.audioFormat === 'mp3' ? `, ${processing.bitRate} kbps` : ''})
              </div>
            </div>
            
            {showsUsingGlobal.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Applied to {showsUsingGlobal.length} show{showsUsingGlobal.length !== 1 ? 's' : ''}</strong> currently using global settings.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 