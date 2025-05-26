#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up Radio Automation Backend...\n')

// Create required directories
const directories = [
  './data',
  './data/backups',
  './logs',
  './temp',
  './output',
  './output/morning-show',
  './output/evening-news'
]

console.log('📁 Creating directories...')
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`   ✓ Created ${dir}`)
  } else {
    console.log(`   - ${dir} already exists`)
  }
})

// Create .env file if it doesn't exist
const envPath = './.env'
const envTemplate = `PORT=3001
FRONTEND_URL=http://localhost:5173
STORAGE_PATH=./data
LOG_LEVEL=info
WATCH_INTERVAL=5000
NODE_ENV=development

# File Processing Settings
MAX_FILE_SIZE=100MB
ALLOWED_EXTENSIONS=.mp3,.wav,.flac,.aac,.m4a
TEMP_DIR=./temp
OUTPUT_BASE_DIR=./output

# Security
CORS_ORIGIN=http://localhost:5173
API_RATE_LIMIT=100

# Logging
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5
`

console.log('\n⚙️  Setting up environment...')
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate)
  console.log('   ✓ Created .env file')
} else {
  console.log('   - .env file already exists')
}

// Create sample show profiles
const sampleShowsPath = './data/sample-shows.json'
const sampleShows = {
  shows: [
    {
      id: 'morning-show-001',
      name: 'Morning Show',
      description: 'Daily morning show files',
      enabled: true,
      filePatterns: [
        {
          id: 'pattern_1',
          pattern: 'MorningShow_*.mp3',
          type: 'watch'
        },
        {
          id: 'pattern_2', 
          pattern: 'MS_*.wav',
          type: 'watch'
        }
      ],
      outputDirectory: './output/morning-show',
      autoProcessing: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'evening-news-001',
      name: 'Evening News',
      description: 'Evening news segments',
      enabled: true,
      filePatterns: [
        {
          id: 'pattern_1',
          pattern: 'EveningNews_*.mp3',
          type: 'watch'
        },
        {
          id: 'pattern_2',
          pattern: 'News_*.wav', 
          type: 'watch'
        }
      ],
      outputDirectory: './output/evening-news',
      autoProcessing: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  queue: [],
  settings: {
    version: '1.0.0',
    watchInterval: 5000
  }
}

console.log('\n📋 Creating sample data...')
if (!fs.existsSync(sampleShowsPath)) {
  fs.writeFileSync(sampleShowsPath, JSON.stringify(sampleShows, null, 2))
  console.log('   ✓ Created sample shows configuration')
} else {
  console.log('   - Sample shows already exist')
}

// Create test files for development
console.log('\n🧪 Creating test files...')
const testFiles = [
  './temp/MorningShow_Episode1.mp3',
  './temp/MorningShow_Interview.wav',
  './temp/EveningNews_Headlines.mp3',
  './temp/News_Weather.wav'
]

testFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '// Mock audio file for testing\n// This is not a real audio file')
    console.log(`   ✓ Created test file ${path.basename(file)}`)
  }
})

console.log('\n✅ Setup complete!')
console.log('\nNext steps:')
console.log('1. Run "npm run dev" to start the development server')
console.log('2. The API will be available at http://localhost:3001')
console.log('3. Check the logs in ./logs/app.log')
console.log('4. Test with sample files in ./temp/')
console.log('\nAPI Endpoints:')
console.log('- GET  http://localhost:3001/api/shows')
console.log('- GET  http://localhost:3001/api/queue') 
console.log('- GET  http://localhost:3001/api/system/status')
console.log('- POST http://localhost:3001/api/watch/start')
console.log('\nFor more information, see README.md') 