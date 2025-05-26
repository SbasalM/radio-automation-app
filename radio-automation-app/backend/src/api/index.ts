import { Express } from 'express'
import showRoutes from './shows'
import queueRoutes from './queue'
import watchRoutes from './watch'
import systemRoutes from './system'

export function setupRoutes(app: Express): void {
  // API base path
  const apiBase = '/api'
  
  // Register route modules
  app.use(`${apiBase}/shows`, showRoutes)
  app.use(`${apiBase}/queue`, queueRoutes)
  app.use(`${apiBase}/watch`, watchRoutes)
  app.use(`${apiBase}/system`, systemRoutes)
} 