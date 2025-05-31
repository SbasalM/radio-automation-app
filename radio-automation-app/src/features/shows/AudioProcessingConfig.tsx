import { useState } from 'react'
import { Volume2, Settings, Sliders, Mic, Waves, Zap, Info, GripVertical, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdvancedAudioSettings, ProcessingOptions } from '@/types/show'

interface AudioProcessingConfigProps {
  processingOptions: ProcessingOptions
  onUpdateProcessingOptions: (options: ProcessingOptions) => void
  activeSection?: 'general' | 'quality' | 'effects' | 'advanced' | 'trim' | 'processing'
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

// Processing chain configuration
const PROCESSING_STEPS = [
  { id: 'noiseGate', name: 'Noise Gate', icon: '🔇', order: 1 },
  { id: 'trimSilence', name: 'Silence Trim', icon: '✂️', order: 2 },
  { id: 'eq', name: 'EQ', icon: '🎛️', order: 3 },
  { id: 'compression', name: 'Compressor', icon: '🗜️', order: 4 },
  { id: 'deEsser', name: 'De-Esser', icon: '🎤', order: 5 },
  { id: 'normalization', name: 'Normalize Audio', icon: '📶', order: 6 },
  { id: 'limiter', name: 'Limiter', icon: '🚧', order: 7 },
  { id: 'fades', name: 'Apply Fades', icon: '🌅', order: 8 },
  { id: 'export', name: 'Export Final Audio', icon: '💾', order: 9 }
]

export function AudioProcessingConfig({ processingOptions, onUpdateProcessingOptions, activeSection }: AudioProcessingConfigProps) {
  const [processingChainOrder, setProcessingChainOrder] = useState(PROCESSING_STEPS)
  
  // Map activeSection prop to internal state
  const getInitialSection = (section?: string) => {
    switch (section) {
      case 'general': return 'general'
      case 'quality': return 'audio'
      case 'effects': return 'effects'
      case 'advanced': return 'advanced'
      case 'trim': return 'trim'
      case 'processing': return 'processing'
      default: return 'general'
    }
  }
  
  const [activeSectionState, setActiveSectionState] = useState<'general' | 'audio' | 'effects' | 'advanced' | 'trim' | 'processing'>(getInitialSection(activeSection))

  // Provide default audio settings if undefined
  const defaultAudioSettings: AdvancedAudioSettings = {
    normalizationLevel: -16,
    autoGain: true,
    trimSilence: false,
    silenceThreshold: -50,
    silencePadding: 0.5,
    fadeInDuration: 0,
    fadeOutDuration: 0,
    outputFormat: 'mp3',
    sampleRate: 44100,
    bitRate: 192,
    enableCompression: false,
    compressionRatio: 3,
    compressionThreshold: -12,
    enableLimiter: false,
    limiterThreshold: -3,
    enableEQ: false,
    lowFreqGain: 0,
    midFreqGain: 0,
    highFreqGain: 0,
    enableDeEsser: false,
    deEsserThreshold: -20,
    enableNoiseGate: false,
    noiseGateThreshold: -60
  }

  const safeProcessingOptions: ProcessingOptions = {
    ...processingOptions,
    audioSettings: processingOptions.audioSettings || defaultAudioSettings
  }

  const updateAudioSettings = (updates: Partial<AdvancedAudioSettings>) => {
    onUpdateProcessingOptions({
      ...safeProcessingOptions,
      audioSettings: {
        ...safeProcessingOptions.audioSettings,
        ...updates
      }
    })
  }

  const loadPreset = (preset: typeof PRESET_CONFIGS[0]) => {
    updateAudioSettings(preset.settings)
  }

  const toggleGlobalSettings = () => {
    onUpdateProcessingOptions({
      ...safeProcessingOptions,
      useGlobalSettings: !safeProcessingOptions.useGlobalSettings
    })
  }

  const getEnabledProcessingSteps = () => {
    const settings = safeProcessingOptions.audioSettings
    return processingChainOrder.filter(step => {
      switch (step.id) {
        case 'noiseGate': return settings.enableNoiseGate
        case 'trimSilence': return settings.trimSilence
        case 'eq': return settings.enableEQ
        case 'compression': return settings.enableCompression
        case 'deEsser': return settings.enableDeEsser
        case 'normalization': return true // Always enabled
        case 'limiter': return settings.enableLimiter
        case 'fades': return settings.fadeInDuration > 0 || settings.fadeOutDuration > 0
        case 'export': return true // Always enabled
        default: return false
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Global Settings Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-blue-600" />
              <span>Audio Processing Settings</span>
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Use Global Settings</span>
              <button
                type="button"
                onClick={toggleGlobalSettings}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  safeProcessingOptions.useGlobalSettings 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                aria-label="Toggle global settings"
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  safeProcessingOptions.useGlobalSettings ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Tab Navigation and Content */}
      {safeProcessingOptions.useGlobalSettings ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-3">Using Global Settings</p>
            <p className="text-sm mb-2">This show will use the global audio processing settings.</p>
            <p className="text-sm">Toggle off above to customize settings for this show.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-6 p-6">
            {/* Quick Presets */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span>Quick Presets</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_CONFIGS.map((preset) => (
                  <Card key={preset.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-2 hover:border-purple-300 dark:hover:border-purple-600">
                    <CardContent 
                      className="p-4" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        loadPreset(preset)
                      }}
                    >
                      <h5 className="font-medium text-gray-900 dark:text-gray-100">{preset.name}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Tab Navigation */}
            {!activeSection && (
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: 'general', label: 'General', icon: Volume2 },
                  { id: 'audio', label: 'Audio Quality', icon: Waves },
                  { id: 'effects', label: 'Effects', icon: Sliders },
                  { id: 'advanced', label: 'Advanced', icon: Zap },
                  { id: 'trim', label: 'Trim Points', icon: Scissors },
                  { id: 'processing', label: 'Processing Chain', icon: Info }
                ].map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    variant={activeSectionState === id ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setActiveSectionState(id as any)
                    }}
                    size="sm"
                    className="flex items-center space-x-2"
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* General Audio Settings */}
            {activeSectionState === 'general' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Volume2 className="h-5 w-5 text-green-600" />
                  <span>General Audio Settings</span>
                </h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Normalization */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Normalization Level (LUFS): {safeProcessingOptions.audioSettings.normalizationLevel}
                      </label>
                      <input
                        type="range"
                        min="-30"
                        max="-12"
                        step="0.5"
                        value={safeProcessingOptions.audioSettings.normalizationLevel}
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
                          checked={safeProcessingOptions.audioSettings.autoGain}
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
                    <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">Silence Detection</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="flex items-center space-x-2 mb-2">
                          <input
                            type="checkbox"
                            checked={safeProcessingOptions.audioSettings.trimSilence}
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
                          Threshold: {safeProcessingOptions.audioSettings.silenceThreshold} dB
                        </label>
                        <input
                          type="range"
                          min="-80"
                          max="-20"
                          step="1"
                          value={safeProcessingOptions.audioSettings.silenceThreshold}
                          onChange={(e) => updateAudioSettings({ silenceThreshold: parseFloat(e.target.value) })}
                          className="w-full"
                          disabled={!safeProcessingOptions.audioSettings.trimSilence}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Padding: {safeProcessingOptions.audioSettings.silencePadding}s
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={safeProcessingOptions.audioSettings.silencePadding}
                          onChange={(e) => updateAudioSettings({ silencePadding: parseFloat(e.target.value) })}
                          className="w-full"
                          disabled={!safeProcessingOptions.audioSettings.trimSilence}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fades */}
                  <div className="space-y-4">
                    <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">Fade Settings</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fade In: {safeProcessingOptions.audioSettings.fadeInDuration}s
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={safeProcessingOptions.audioSettings.fadeInDuration}
                          onChange={(e) => updateAudioSettings({ fadeInDuration: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fade Out: {safeProcessingOptions.audioSettings.fadeOutDuration}s
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={safeProcessingOptions.audioSettings.fadeOutDuration}
                          onChange={(e) => updateAudioSettings({ fadeOutDuration: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Quality Controls */}
            {activeSectionState === 'audio' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Waves className="h-5 w-5 text-blue-600" />
                  <span>Audio Quality Controls</span>
                </h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Output Format
                      </label>
                      <select
                        value={safeProcessingOptions.audioSettings.outputFormat}
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
                        value={safeProcessingOptions.audioSettings.sampleRate}
                        onChange={(e) => updateAudioSettings({ sampleRate: parseInt(e.target.value) as AdvancedAudioSettings['sampleRate'] })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="44100">44.1 kHz</option>
                        <option value="48000">48 kHz</option>
                        <option value="96000">96 kHz</option>
                      </select>
                    </div>

                    {safeProcessingOptions.audioSettings.outputFormat === 'mp3' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          MP3 Bit Rate
                        </label>
                        <select
                          value={safeProcessingOptions.audioSettings.bitRate}
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
              </div>
            )}

            {/* Effects Panel */}
            {activeSectionState === 'effects' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Sliders className="h-5 w-5 text-orange-600" />
                  <span>Effects Panel</span>
                </h4>
                <div className="space-y-6">
                  {/* Compression */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={safeProcessingOptions.audioSettings.enableCompression}
                        onChange={(e) => updateAudioSettings({ enableCompression: e.target.checked })}
                        className="rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">🗜️ Compression</h5>
                    </div>
                    
                    {safeProcessingOptions.audioSettings.enableCompression && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ratio: {safeProcessingOptions.audioSettings.compressionRatio}:1
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={safeProcessingOptions.audioSettings.compressionRatio}
                            onChange={(e) => updateAudioSettings({ compressionRatio: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Threshold: {safeProcessingOptions.audioSettings.compressionThreshold} dB
                          </label>
                          <input
                            type="range"
                            min="-30"
                            max="-6"
                            step="0.5"
                            value={safeProcessingOptions.audioSettings.compressionThreshold}
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
                        checked={safeProcessingOptions.audioSettings.enableLimiter}
                        onChange={(e) => updateAudioSettings({ enableLimiter: e.target.checked })}
                        className="rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">🚧 Limiter</h5>
                    </div>
                    
                    {safeProcessingOptions.audioSettings.enableLimiter && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Threshold: {safeProcessingOptions.audioSettings.limiterThreshold} dB
                        </label>
                        <input
                          type="range"
                          min="-6"
                          max="0"
                          step="0.1"
                          value={safeProcessingOptions.audioSettings.limiterThreshold}
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
                        checked={safeProcessingOptions.audioSettings.enableEQ}
                        onChange={(e) => updateAudioSettings({ enableEQ: e.target.checked })}
                        className="rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">🎛️ EQ (3-Band)</h5>
                    </div>
                    
                    {safeProcessingOptions.audioSettings.enableEQ && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Low: {safeProcessingOptions.audioSettings.lowFreqGain > 0 ? '+' : ''}{safeProcessingOptions.audioSettings.lowFreqGain} dB
                          </label>
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={safeProcessingOptions.audioSettings.lowFreqGain}
                            onChange={(e) => updateAudioSettings({ lowFreqGain: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Mid: {safeProcessingOptions.audioSettings.midFreqGain > 0 ? '+' : ''}{safeProcessingOptions.audioSettings.midFreqGain} dB
                          </label>
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={safeProcessingOptions.audioSettings.midFreqGain}
                            onChange={(e) => updateAudioSettings({ midFreqGain: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            High: {safeProcessingOptions.audioSettings.highFreqGain > 0 ? '+' : ''}{safeProcessingOptions.audioSettings.highFreqGain} dB
                          </label>
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={safeProcessingOptions.audioSettings.highFreqGain}
                            onChange={(e) => updateAudioSettings({ highFreqGain: parseFloat(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Options */}
            {activeSectionState === 'advanced' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-red-600" />
                  <span>Advanced Options</span>
                </h4>
                <div className="space-y-6">
                  {/* De-Esser */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={safeProcessingOptions.audioSettings.enableDeEsser}
                        onChange={(e) => updateAudioSettings({ enableDeEsser: e.target.checked })}
                        className="rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">🎤 De-Esser</h5>
                    </div>
                    
                    {safeProcessingOptions.audioSettings.enableDeEsser && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Threshold: {safeProcessingOptions.audioSettings.deEsserThreshold} dB
                        </label>
                        <input
                          type="range"
                          min="-30"
                          max="-10"
                          step="1"
                          value={safeProcessingOptions.audioSettings.deEsserThreshold}
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
                        checked={safeProcessingOptions.audioSettings.enableNoiseGate}
                        onChange={(e) => updateAudioSettings({ enableNoiseGate: e.target.checked })}
                        className="rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">🔇 Noise Gate</h5>
                    </div>
                    
                    {safeProcessingOptions.audioSettings.enableNoiseGate && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Threshold: {safeProcessingOptions.audioSettings.noiseGateThreshold} dB
                        </label>
                        <input
                          type="range"
                          min="-80"
                          max="-30"
                          step="1"
                          value={safeProcessingOptions.audioSettings.noiseGateThreshold}
                          onChange={(e) => updateAudioSettings({ noiseGateThreshold: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Trim Points */}
            {activeSectionState === 'trim' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Scissors className="h-5 w-5 text-purple-600" />
                  <span>Trim Points</span>
                </h4>
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center space-x-2">
                      <Info className="h-4 w-4" />
                      <span>Visual Trim Editor</span>
                    </h5>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      The visual trim editor allows you to precisely set start and end points for audio files using an interactive waveform display.
                    </p>
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>💡 How it works:</strong> Upload a sample audio file to see its waveform, then drag the red handles to set trim points visually. 
                      The trim settings will be applied to all files processed with this show profile.
                    </div>
                  </div>

                  {/* Manual Trim Settings */}
                  <div className="space-y-4">
                    <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">Manual Trim Settings</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Time (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.0"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Where to start the audio (in seconds from beginning)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Time (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Auto (full duration)"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Where to end the audio (leave empty for full duration)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Trim Options */}
                  <div className="space-y-4">
                    <h5 className="text-base font-medium text-gray-900 dark:text-gray-100">Trim Options</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Fade In
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                          Apply a smooth fade-in at the start point
                        </p>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Fade Out
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                          Apply a smooth fade-out at the end point
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Visual Editor Access */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center space-x-2">
                      <Scissors className="h-4 w-4" />
                      <span>Visual Trim Editor</span>
                    </h5>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                      For precise trim point setting, use the visual waveform editor when creating or editing individual show episodes.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
                    >
                      <Scissors className="h-4 w-4 mr-2" />
                      Access in Show Episodes
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Chain */}
            {activeSectionState === 'processing' && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
                  <Info className="h-5 w-5 text-indigo-600" />
                  <span>Processing Chain</span>
                </h4>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The audio processing pipeline shows the order in which effects will be applied to your audio files.
                  </p>
                  
                  <div className="space-y-3">
                    {getEnabledProcessingSteps().map((step, index) => (
                      <div 
                        key={`${step.id}-${index}`} 
                        className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                      >
                        {/* Drag Handle (placeholder for future drag-and-drop) */}
                        <div className="flex-shrink-0 text-gray-400 hover:text-gray-600 cursor-grab">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        
                        {/* Step Number */}
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                          {index + 1}
                        </div>
                        
                        {/* Step Icon */}
                        <div className="flex-shrink-0 text-2xl">
                          {step.icon}
                        </div>
                        
                        {/* Step Name and Description */}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{step.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {step.id === 'noiseGate' && 'Removes background noise below threshold'}
                            {step.id === 'trimSilence' && 'Automatically removes silence from start/end'}
                            {step.id === 'eq' && 'Adjusts frequency balance (Low/Mid/High)'}
                            {step.id === 'compression' && 'Controls dynamic range'}
                            {step.id === 'deEsser' && 'Reduces harsh sibilant sounds'}
                            {step.id === 'normalization' && 'Sets consistent volume level'}
                            {step.id === 'limiter' && 'Prevents audio clipping'}
                            {step.id === 'fades' && 'Applies smooth fade in/out'}
                            {step.id === 'export' && 'Saves final processed audio'}
                          </div>
                        </div>
                        
                        {/* Enable/Disable Toggle */}
                        <div className="flex-shrink-0">
                          {(step.id === 'normalization' || step.id === 'export') ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                // Toggle the specific effect
                                switch (step.id) {
                                  case 'noiseGate':
                                    updateAudioSettings({ enableNoiseGate: !safeProcessingOptions.audioSettings.enableNoiseGate })
                                    break
                                  case 'trimSilence':
                                    updateAudioSettings({ trimSilence: !safeProcessingOptions.audioSettings.trimSilence })
                                    break
                                  case 'eq':
                                    updateAudioSettings({ enableEQ: !safeProcessingOptions.audioSettings.enableEQ })
                                    break
                                  case 'compression':
                                    updateAudioSettings({ enableCompression: !safeProcessingOptions.audioSettings.enableCompression })
                                    break
                                  case 'deEsser':
                                    updateAudioSettings({ enableDeEsser: !safeProcessingOptions.audioSettings.enableDeEsser })
                                    break
                                  case 'limiter':
                                    updateAudioSettings({ enableLimiter: !safeProcessingOptions.audioSettings.enableLimiter })
                                    break
                                  case 'fades':
                                    // Toggle fades - if either is > 0, turn both off, otherwise set defaults
                                    const hasFades = safeProcessingOptions.audioSettings.fadeInDuration > 0 || safeProcessingOptions.audioSettings.fadeOutDuration > 0
                                    updateAudioSettings({ 
                                      fadeInDuration: hasFades ? 0 : 0.5,
                                      fadeOutDuration: hasFades ? 0 : 1.0
                                    })
                                    break
                                }
                              }}
                              className={`w-6 h-6 rounded-full border-2 transition-colors ${
                                true // Step is enabled if it's in the list
                                  ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' 
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                              }`}
                            >
                              <span className="text-xs font-bold">✓</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Processing Summary */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center space-x-2">
                      <Info className="h-4 w-4" />
                      <span>Processing Summary</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-blue-800 dark:text-blue-200">
                      <div>
                        <strong>Format:</strong> {safeProcessingOptions.audioSettings.outputFormat.toUpperCase()} @ {safeProcessingOptions.audioSettings.sampleRate / 1000} kHz
                      </div>
                      {safeProcessingOptions.audioSettings.outputFormat === 'mp3' && (
                        <div>
                          <strong>Bitrate:</strong> {safeProcessingOptions.audioSettings.bitRate} kbps
                        </div>
                      )}
                      <div>
                        <strong>Normalization:</strong> {safeProcessingOptions.audioSettings.normalizationLevel} LUFS
                      </div>
                      <div>
                        <strong>Processing steps:</strong> {getEnabledProcessingSteps().length}
                      </div>
                    </div>
                    
                    {/* Quick Info */}
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        💡 <strong>Tip:</strong> Drag the ≡ handles to reorder processing steps (coming soon). 
                        Click the ✓ buttons to enable/disable individual effects.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}
    </div>
  )
} 