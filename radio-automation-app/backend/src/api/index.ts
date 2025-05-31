import { Express } from 'express'
import showRoutes from './shows'
import queueRoutes from './queue'
import watchRoutes from './watch'
import systemRoutes from './system'

export function setupRoutes(app: Express): void {
  // Mount API routes
  app.use('/api/shows', showRoutes)
  app.use('/api/queue', queueRoutes)
  app.use('/api/watch', watchRoutes) // Mount watch routes under /api/watch
  app.use('/api/system', systemRoutes) // Fix: mount system routes under /api/system instead of /api/status
} 