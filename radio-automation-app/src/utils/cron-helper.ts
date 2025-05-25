import type { CronPreset } from '@/types/ftp'

// Predefined cron presets for common schedules
export const cronPresets: CronPreset[] = [
  {
    id: 'daily-6am',
    name: 'Daily at 6:00 AM',
    expression: '0 6 * * *',
    description: 'Runs every day at 6:00 AM'
  },
  {
    id: 'daily-12pm',
    name: 'Daily at 12:00 PM',
    expression: '0 12 * * *',
    description: 'Runs every day at 12:00 PM'
  },
  {
    id: 'weekdays-5am',
    name: 'Weekdays at 5:00 AM',
    expression: '0 5 * * 1-5',
    description: 'Runs Monday through Friday at 5:00 AM'
  },
  {
    id: 'monday-6am',
    name: 'Monday at 6:00 AM',
    expression: '0 6 * * 1',
    description: 'Runs every Monday at 6:00 AM'
  },
  {
    id: 'hourly',
    name: 'Every Hour',
    expression: '0 * * * *',
    description: 'Runs at the top of every hour'
  },
  {
    id: 'every-6-hours',
    name: 'Every 6 Hours',
    expression: '0 */6 * * *',
    description: 'Runs every 6 hours starting at midnight'
  }
]

// Simple cron parser for basic expressions (minute hour day month dayOfWeek)
export function parseCronExpression(expression: string): {
  minute: number[]
  hour: number[]
  day: number[]
  month: number[]
  dayOfWeek: number[]
} {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression format')
  }

  return {
    minute: parseCronField(parts[0], 0, 59),
    hour: parseCronField(parts[1], 0, 23),
    day: parseCronField(parts[2], 1, 31),
    month: parseCronField(parts[3], 1, 12),
    dayOfWeek: parseCronField(parts[4], 0, 6) // 0 = Sunday
  }
}

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
  }

  if (field.includes('/')) {
    const [range, step] = field.split('/')
    const stepNum = parseInt(step)
    const baseRange = range === '*' 
      ? Array.from({ length: max - min + 1 }, (_, i) => min + i)
      : parseCronField(range, min, max)
    
    return baseRange.filter((_, index) => index % stepNum === 0)
  }

  if (field.includes('-')) {
    const [start, end] = field.split('-').map(Number)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  if (field.includes(',')) {
    return field.split(',').map(Number)
  }

  return [parseInt(field)]
}

// Calculate the next run time based on cron expression
export function getNextRunTime(cronExpression: string, fromDate: Date = new Date()): Date {
  try {
    const parsed = parseCronExpression(cronExpression)
    const next = new Date(fromDate)
    
    // Start from the next minute
    next.setSeconds(0)
    next.setMilliseconds(0)
    next.setMinutes(next.getMinutes() + 1)

    // Find the next valid time (simple implementation for common cases)
    for (let attempts = 0; attempts < 366 * 24 * 60; attempts++) { // Max 1 year of minutes
      const currentMinute = next.getMinutes()
      const currentHour = next.getHours()
      const currentDay = next.getDate()
      const currentMonth = next.getMonth() + 1
      const currentDayOfWeek = next.getDay()

      if (
        parsed.minute.includes(currentMinute) &&
        parsed.hour.includes(currentHour) &&
        parsed.day.includes(currentDay) &&
        parsed.month.includes(currentMonth) &&
        parsed.dayOfWeek.includes(currentDayOfWeek)
      ) {
        return next
      }

      // Increment by 1 minute
      next.setMinutes(next.getMinutes() + 1)
    }

    throw new Error('Could not find next run time within reasonable timeframe')
  } catch (error) {
    // Fallback: return 1 day from now if parsing fails
    const fallback = new Date(fromDate)
    fallback.setDate(fallback.getDate() + 1)
    return fallback
  }
}

// Get next N run times for preview
export function getNextRunTimes(cronExpression: string, count: number = 5): Date[] {
  const times: Date[] = []
  let currentDate = new Date()

  for (let i = 0; i < count; i++) {
    try {
      currentDate = getNextRunTime(cronExpression, currentDate)
      times.push(new Date(currentDate))
      currentDate.setMinutes(currentDate.getMinutes() + 1) // Move past this time for next calculation
    } catch (error) {
      break
    }
  }

  return times
}

// Validate cron expression format
export function isValidCronExpression(expression: string): boolean {
  try {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return false
    
    parseCronExpression(expression)
    return true
  } catch {
    return false
  }
}

// Format date for display
export function formatNextRun(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  } else if (diffMinutes > 0) {
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  } else {
    return 'very soon'
  }
}

// Replace date patterns in file patterns
export function replaceDatePatterns(pattern: string, date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const yearShort = String(year).slice(-2)

  return pattern
    .replace(/{YYYY}/g, String(year))
    .replace(/{YY}/g, yearShort)
    .replace(/{MM}/g, month)
    .replace(/{DD}/g, day)
    .replace(/{YYYY-MM-DD}/g, `${year}-${month}-${day}`)
    .replace(/{MM-DD-YYYY}/g, `${month}-${day}-${year}`)
    .replace(/{DD-MM-YYYY}/g, `${day}-${month}-${year}`)
} 