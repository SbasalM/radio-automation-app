import { useState } from 'react'
import { Volume2, Settings, Sliders, Mic, Waves, Zap, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdvancedAudioSettings, ProcessingOptions } from '@/types/show'

interface AudioProcessingConfigProps {
  processingOptions: ProcessingOptions
  onUpdateProcessingOptions: (options: ProcessingOptions) => void
}

// Default audio settings for different show types
const PRESET_CONFIGS = [
  {
    name: 'Speech/Talk Radio',
    description: 'Optimized for spoken content with compression and noise reduction',
    settings: {
      normalizationLevel: -16,
      autoGain: true,
      trimSilence: true,
      silenceThreshold: -50,
      silencePadding: 0.5,
      fadeInDuration: 0.5,
      fadeOutDuration: 1.0,
      outputFormat: 'mp3' as const,
      sampleRate: 44100 as const,
      bitRate: 192 as const,
      enableCompression: true,
      compressionRatio: 4,
      compressionThreshold: -12,
      enableLimiter: true,
      limiterThreshold: -3,
      enableEQ: true,
      lowFreqGain: -2,
      midFreqGain: 2,
      highFreqGain: 1,
      enableDeEsser: true,
      deEsserThreshold: -15,
      enableNoiseGate: true,
      noiseGateThreshold: -50
    }
  },
  {
    name: 'Music/High Quality',
    description: 'Minimal processing for music content with high fidelity',
    settings: {
      normalizationLevel: -14,
      autoGain: false,
      trimSilence: false,
      silenceThreshold: -60,
      silencePadding: 0,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      outputFormat: 'mp3' as const,
      sampleRate: 48000 as const,
      bitRate: 320 as const,
      enableCompression: false,
      compressionRatio: 1,
      compressionThreshold: -6,
      enableLimiter: true,
      limiterThreshold: -1,
      enableEQ: false,
      lowFreqGain: 0,
      midFreqGain: 0,
      highFreqGain: 0,
      enableDeEsser: false,
      deEsserThreshold: -20,
      enableNoiseGate: false,
      noiseGateThreshold: -60
    }
  },
  {
    name: 'News/Broadcast',
    description: 'Aggressive processing for clear, punchy broadcast sound',
    settings: {
      normalizationLevel: -23,
      autoGain: true,
      trimSilence: false,
      silenceThreshold: -45,
      silencePadding: 0.2,
      fadeInDuration: 0,
      fadeOutDuration: 0.5,
      outputFormat: 'mp3' as const,
      sampleRate: 44100 as const,
      bitRate: 256 as const,
      enableCompression: true,
      compressionRatio: 6,
      compressionThreshold: -18,
      enableLimiter: true,
      limiterThreshold: -1,
      enableEQ: true,
      lowFreqGain: -3,
      midFreqGain: 3,
      highFreqGain: 2,
      enableDeEsser: true,
      deEsserThreshold: -12,
      enableNoiseGate: true,
      noiseGateThreshold: -45
    }
  }
]

export function AudioProcessingConfig({ processingOptions, onUpdateProcessingOptions }: AudioProcessingConfigProps) {
  const [activeSection, setActiveSection] = useState<'general' | 'audio' | 'effects' | 'advanced' | 'preview'>('general')

  const updateAudioSettings = (updates: Partial<AdvancedAudioSettings>) => {
    onUpdateProcessingOptions({
      ...processingOptions,
      audioSettings: {
        ...processingOptions.audioSettings,
        ...updates
      }
    })
  }

  const loadPreset = (preset: typeof PRESET_CONFIGS[0]) => {
    updateAudioSettings(preset.settings)
  }

  const toggleGlobalSettings = () => {
    onUpdateProcessingOptions({
      ...processingOptions,
      useGlobalSettings: !processingOptions.useGlobalSettings
    })
  }

  const getProcessingChain = () => {
    const chain = []
    const settings = processingOptions.audioSettings

    if (settings.enableNoiseGate) chain.push('Noise Gate')
    if (settings.trimSilence) chain.push('Silence Trim')
    if (settings.enableEQ) chain.push('EQ')
    if (settings.enableCompression) chain.push('Compressor')
    if (settings.enableDeEsser) chain.push('De-Esser')
    chain.push('Normalization')
    if (settings.enableLimiter) chain.push('Limiter')
    if (settings.fadeInDuration > 0 || settings.fadeOutDuration > 0) chain.push('Fades')

    return chain
  }

  return (
    <div className="space-y-6">
      {/* Global Settings Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Audio Processing Settings</span>
            </span>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Use Global Settings</label>
              <input
                type="checkbox"
                checked={processingOptions.useGlobalSettings}
                onChange={toggleGlobalSettings}
                className="rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardTitle>
        </CardHeader>
        
        {!processingOptions.useGlobalSettings && (
          <CardContent>
            {/* Preset Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quick Presets
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_CONFIGS.map((preset) => (
                  <Card key={preset.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <CardContent className="p-4" onClick={() => loadPreset(preset)}>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">{preset.name}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Section Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'general', label: 'General', icon: Volume2 },
                { id: 'audio', label: 'Audio Quality', icon: Waves },
                { id: 'effects', label: 'Effects', icon: Sliders },
                { id: 'advanced', label: 'Advanced', icon: Zap },
                { id: 'preview', label: 'Processing Chain', icon: Info }
              ].map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={activeSection === id ? 'default' : 'outline'}
                  onClick={() => setActiveSection(id as any)}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>

            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Normalization */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Normalization Level (LUFS): {processingOptions.audioSettings.normalizationLevel}
                    </label>
                    <input
                      type="range"
                      min="-30"
                      max="-12"
                      step="0.5"
                      value={processingOptions.audioSettings.normalizationLevel}
                      onChange={(e) => updateAudioSettings({ normalizationLevel: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>-30 LUFS (Quiet)</span>
                      <span>-12 LUFS (Loud)</span>
                    </div>
                  </div>

                  {/* Auto Gain */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={processingOptions.audioSettings.autoGain}
                        onChange={(e) => updateAudioSettings({ autoGain: e.target.checked })}
                        className="rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Auto Gain
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Automatically adjust gain to reach target normalization level
                    </p>
                  </div>
                </div>

                {/* Silence Detection */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Silence Detection</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={processingOptions.audioSettings.trimSilence}
                          onChange={(e) => updateAudioSettings({ trimSilence: e.target.checked })}
                          className="rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Trim Silence
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Threshold: {processingOptions.audioSettings.silenceThreshold} dB
                      </label>
                      <input
                        type="range"
                        min="-80"
                        max="-20"
                        step="1"
                        value={processingOptions.audioSettings.silenceThreshold}
                        onChange={(e) => updateAudioSettings({ silenceThreshold: parseFloat(e.target.value) })}
                        className="w-full"
                        disabled={!processingOptions.audioSettings.trimSilence}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Padding: {processingOptions.audioSettings.silencePadding}s
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={processingOptions.audioSettings.silencePadding}
                        onChange={(e) => updateAudioSettings({ silencePadding: parseFloat(e.target.value) })}
                        className="w-full"
                        disabled={!processingOptions.audioSettings.trimSilence}
                      />
                    </div>
                  </div>
                </div>

                {/* Fades */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Fade Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fade In: {processingOptions.audioSettings.fadeInDuration}s
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={processingOptions.audioSettings.fadeInDuration}
                        onChange={(e) => updateAudioSettings({ fadeInDuration: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fade Out: {processingOptions.audioSettings.fadeOutDuration}s
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={processingOptions.audioSettings.fadeOutDuration}
                        onChange={(e) => updateAudioSettings({ fadeOutDuration: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Quality Settings */}
            {activeSection === 'audio' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Output Format
                    </label>
                    <select
                      value={processingOptions.audioSettings.outputFormat}
                      onChange={(e) => updateAudioSettings({ outputFormat: e.target.value as AdvancedAudioSettings['outputFormat'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mp3">MP3</option>
                      <option value="wav">WAV</option>
                      <option value="flac">FLAC</option>
                      <option value="aac">AAC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sample Rate
                    </label>
                    <select
                      value={processingOptions.audioSettings.sampleRate}
                      onChange={(e) => updateAudioSettings({ sampleRate: parseInt(e.target.value) as AdvancedAudioSettings['sampleRate'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="44100">44.1 kHz</option>
                      <option value="48000">48 kHz</option>
                      <option value="96000">96 kHz</option>
                    </select>
                  </div>

                  {processingOptions.audioSettings.outputFormat === 'mp3' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        MP3 Bit Rate
                      </label>
                      <select
                        value={processingOptions.audioSettings.bitRate}
                        onChange={(e) => updateAudioSettings({ bitRate: parseInt(e.target.value) as AdvancedAudioSettings['bitRate'] })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="128">128 kbps</option>
                        <option value="192">192 kbps</option>
                        <option value="256">256 kbps</option>
                        <option value="320">320 kbps</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Effects Settings */}
            {activeSection === 'effects' && (
              <div className="space-y-6">
                {/* Compression */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={processingOptions.audioSettings.enableCompression}
                      onChange={(e) => updateAudioSettings({ enableCompression: e.target.checked })}
                      className="rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Compression</h4>
                  </div>
                  
                  {processingOptions.audioSettings.enableCompression && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ratio: {processingOptions.audioSettings.compressionRatio}:1
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={processingOptions.audioSettings.compressionRatio}
                          onChange={(e) => updateAudioSettings({ compressionRatio: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Threshold: {processingOptions.audioSettings.compressionThreshold} dB
                        </label>
                        <input
                          type="range"
                          min="-30"
                          max="-6"
                          step="0.5"
                          value={processingOptions.audioSettings.compressionThreshold}
                          onChange={(e) => updateAudioSettings({ compressionThreshold: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Limiter */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={processingOptions.audioSettings.enableLimiter}
                      onChange={(e) => updateAudioSettings({ enableLimiter: e.target.checked })}
                      className="rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Limiter</h4>
                  </div>
                  
                  {processingOptions.audioSettings.enableLimiter && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Threshold: {processingOptions.audioSettings.limiterThreshold} dB
                      </label>
                      <input
                        type="range"
                        min="-6"
                        max="0"
                        step="0.1"
                        value={processingOptions.audioSettings.limiterThreshold}
                        onChange={(e) => updateAudioSettings({ limiterThreshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* EQ */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={processingOptions.audioSettings.enableEQ}
                      onChange={(e) => updateAudioSettings({ enableEQ: e.target.checked })}
                      className="rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">EQ (3-Band)</h4>
                  </div>
                  
                  {processingOptions.audioSettings.enableEQ && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Low: {processingOptions.audioSettings.lowFreqGain > 0 ? '+' : ''}{processingOptions.audioSettings.lowFreqGain} dB
                        </label>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={processingOptions.audioSettings.lowFreqGain}
                          onChange={(e) => updateAudioSettings({ lowFreqGain: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Mid: {processingOptions.audioSettings.midFreqGain > 0 ? '+' : ''}{processingOptions.audioSettings.midFreqGain} dB
                        </label>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={processingOptions.audioSettings.midFreqGain}
                          onChange={(e) => updateAudioSettings({ midFreqGain: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          High: {processingOptions.audioSettings.highFreqGain > 0 ? '+' : ''}{processingOptions.audioSettings.highFreqGain} dB
                        </label>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={processingOptions.audioSettings.highFreqGain}
                          onChange={(e) => updateAudioSettings({ highFreqGain: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            {activeSection === 'advanced' && (
              <div className="space-y-6">
                {/* De-Esser */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={processingOptions.audioSettings.enableDeEsser}
                      onChange={(e) => updateAudioSettings({ enableDeEsser: e.target.checked })}
                      className="rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">De-Esser</h4>
                  </div>
                  
                  {processingOptions.audioSettings.enableDeEsser && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Threshold: {processingOptions.audioSettings.deEsserThreshold} dB
                      </label>
                      <input
                        type="range"
                        min="-30"
                        max="-10"
                        step="1"
                        value={processingOptions.audioSettings.deEsserThreshold}
                        onChange={(e) => updateAudioSettings({ deEsserThreshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Noise Gate */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={processingOptions.audioSettings.enableNoiseGate}
                      onChange={(e) => updateAudioSettings({ enableNoiseGate: e.target.checked })}
                      className="rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Noise Gate</h4>
                  </div>
                  
                  {processingOptions.audioSettings.enableNoiseGate && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Threshold: {processingOptions.audioSettings.noiseGateThreshold} dB
                      </label>
                      <input
                        type="range"
                        min="-80"
                        max="-30"
                        step="1"
                        value={processingOptions.audioSettings.noiseGateThreshold}
                        onChange={(e) => updateAudioSettings({ noiseGateThreshold: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing Chain Preview */}
            {activeSection === 'preview' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Processing Chain</h4>
                
                <div className="space-y-3">
                  {getProcessingChain().map((step, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{step}</div>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        <Zap className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Processing Summary</h5>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <div>Format: {processingOptions.audioSettings.outputFormat.toUpperCase()} @ {processingOptions.audioSettings.sampleRate / 1000} kHz</div>
                    {processingOptions.audioSettings.outputFormat === 'mp3' && (
                      <div>Bitrate: {processingOptions.audioSettings.bitRate} kbps</div>
                    )}
                    <div>Normalization: {processingOptions.audioSettings.normalizationLevel} LUFS</div>
                    <div>Processing steps: {getProcessingChain().length}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
        
        {processingOptions.useGlobalSettings && (
          <CardContent>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This show will use the global audio processing settings.</p>
              <p className="text-sm">Uncheck "Use Global Settings" above to customize for this show.</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
} 