import { AudioLines, Volume2, Zap, Sliders } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'

export function ProcessingSettings() {
  const { settings, updateProcessingDefaults } = useSettingsStore()
  const { processing } = settings

  return (
    <div className="space-y-6">
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
          <CardTitle>Processing Chain Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Processing Chain:</strong>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 