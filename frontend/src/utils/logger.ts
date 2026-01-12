import { api } from '../services/api'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const sendLog = async (level: LogLevel, message: string, data?: any) => {
  try {
    await api.post('/api/log', { level, message, data })
  } catch {
    // Silently fail - don't break app if logging fails
  }
}

export const logger = {
  debug: (msg: string, data?: any) => sendLog('DEBUG', msg, data),
  info: (msg: string, data?: any) => sendLog('INFO', msg, data),
  warn: (msg: string, data?: any) => sendLog('WARN', msg, data),
  error: (msg: string, data?: any) => sendLog('ERROR', msg, data),
}
