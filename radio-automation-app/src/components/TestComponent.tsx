import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MetadataConfig } from '@/features/shows/MetadataConfig'
import { AudioProcessingConfig } from '@/features/shows/AudioProcessingConfig'
import type { MetadataMapping, FileNamingRules, ProcessingOptions } from '@/types/show'

const DEFAULT_METADATA_MAPPING: MetadataMapping = {
  inputPatterns: ['test_pattern'],
  extractionRules: [],
  outputMetadata: {
    title: 'Test Title',
    artist: 'Test Artist',
    album: 'Test Album',
    genre: 'Test',
    customFields: {}
  }
}

const DEFAULT_FILE_NAMING_RULES: FileNamingRules = {
  outputPattern: 'test_{YYYY}-{MM}-{DD}',
  dateFormat: 'YYYY-MM-DD',
  caseConversion: 'none',
  invalidCharacterHandling: 'underscore'
}

const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  normalize: true,
  addPromoTag: false,
  useGlobalSettings: true,
  audioSettings: {
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
}

export function TestComponent() {
  const [activeTest, setActiveTest] = useState<'metadata' | 'audio' | 'none'>('none')
  const [metadataMapping, setMetadataMapping] = useState(DEFAULT_METADATA_MAPPING)
  const [fileNamingRules, setFileNamingRules] = useState(DEFAULT_FILE_NAMING_RULES)
  const [processingOptions, setProcessingOptions] = useState(DEFAULT_PROCESSING_OPTIONS)

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Component Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={() => setActiveTest('metadata')}
                variant={activeTest === 'metadata' ? 'default' : 'outline'}
              >
                Test Metadata Config
              </Button>
              <Button 
                onClick={() => setActiveTest('audio')}
                variant={activeTest === 'audio' ? 'default' : 'outline'}
              >
                Test Audio Config
              </Button>
              <Button 
                onClick={() => setActiveTest('none')}
                variant={activeTest === 'none' ? 'default' : 'outline'}
              >
                Clear Test
              </Button>
            </div>

            {activeTest === 'metadata' && (
              <div className="border p-4 rounded">
                <h3 className="text-lg font-medium mb-4">MetadataConfig Test</h3>
                <MetadataConfig
                  metadataMapping={metadataMapping}
                  fileNamingRules={fileNamingRules}
                  onUpdateMapping={setMetadataMapping}
                  onUpdateNamingRules={setFileNamingRules}
                />
              </div>
            )}

            {activeTest === 'audio' && (
              <div className="border p-4 rounded">
                <h3 className="text-lg font-medium mb-4">AudioProcessingConfig Test</h3>
                <AudioProcessingConfig
                  processingOptions={processingOptions}
                  onUpdateProcessingOptions={setProcessingOptions}
                />
              </div>
            )}

            {activeTest === 'none' && (
              <div className="text-center py-8 text-gray-500">
                Select a component to test above
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 