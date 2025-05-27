import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { httpClient } from '@/utils/http-client'
import { showApiService } from '@/services/show-api'
import { queueApiService } from '@/services/queue-api'
import { watchApiService } from '@/services/watch-api'

export function ApiTest() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const testEndpoint = async (name: string, testFn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [name]: true }))
    try {
      const result = await testFn()
      setResults(prev => ({ ...prev, [name]: { success: true, data: result } }))
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }))
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }))
    }
  }

  const tests = [
    {
      name: 'Health Check',
      test: () => httpClient.healthCheck()
    },
    {
      name: 'Get Shows',
      test: () => showApiService.getAllShows()
    },
    {
      name: 'Get Queue',
      test: () => queueApiService.getAllQueuedFiles()
    },
    {
      name: 'Watch Status',
      test: () => watchApiService.getWatchStatus()
    }
  ]

  const runAllTests = async () => {
    for (const test of tests) {
      await testEndpoint(test.name, test.test)
    }
  }

  useEffect(() => {
    runAllTests()
  }, [])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runAllTests} className="w-full">
          Run All Tests
        </Button>
        
        {tests.map(test => (
          <div key={test.name} className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{test.name}</h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => testEndpoint(test.name, test.test)}
                disabled={loading[test.name]}
              >
                {loading[test.name] ? 'Testing...' : 'Test'}
              </Button>
            </div>
            
            {results[test.name] && (
              <div className={`p-2 rounded text-sm ${
                results[test.name].success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {results[test.name].success ? (
                  <div>
                    <div className="font-medium">✅ Success</div>
                    <pre className="mt-1 text-xs overflow-auto">
                      {JSON.stringify(results[test.name].data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">❌ Error</div>
                    <div className="mt-1">{results[test.name].error}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 