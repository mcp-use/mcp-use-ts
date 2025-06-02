import type { Logger as WinstonLogger } from 'winston'
import fs from 'node:fs'
import path from 'node:path'
import { createLogger, format, transports } from 'winston'

const { combine, timestamp, label, printf, colorize, splat } = format

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly'

interface LoggerOptions {
  level?: LogLevel
  console?: boolean
  file?: string
  format?: 'minimal' | 'detailed' | 'emoji'
}

const DEFAULT_LOGGER_NAME = 'mcp-use'

function resolveLevel(env: string | undefined): LogLevel {
  switch (env?.trim()) {
    case '2':
      return 'debug'
    case '1':
      return 'info'
    default:
      return 'warn'
  }
}

const minimalFormatter = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`
})

const detailedFormatter = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`
})

const emojiFormatter = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`
})

export class Logger {
  private static instances: Record<string, WinstonLogger> = {}
  private static currentFormat: 'minimal' | 'detailed' | 'emoji' = 'minimal'

  public static get(name: string = DEFAULT_LOGGER_NAME): WinstonLogger {
    if (!this.instances[name]) {
      this.instances[name] = createLogger({
        level: resolveLevel(process.env.DEBUG),
        format: combine(
          colorize(),
          splat(),
          label({ label: name }),
          timestamp({ format: 'HH:mm:ss' }),
          this.getFormatter(),
        ),
        transports: [],
      })
    }

    return this.instances[name]
  }

  private static getFormatter() {
    switch (this.currentFormat) {
      case 'minimal':
        return minimalFormatter
      case 'detailed':
        return detailedFormatter
      case 'emoji':
        return emojiFormatter
      default:
        return minimalFormatter
    }
  }

  public static configure(options: LoggerOptions = {}): void {
    const { level, console = true, file, format = 'minimal' } = options
    const resolvedLevel = level ?? resolveLevel(process.env.DEBUG)

    this.currentFormat = format
    const root = this.get()

    root.level = resolvedLevel

    root.clear()

    if (console) {
      root.add(new transports.Console())
    }

    if (file) {
      const dir = path.dirname(path.resolve(file))
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      root.add(new transports.File({ filename: file }))
    }

    // Update all existing loggers with new format
    Object.values(this.instances).forEach((logger) => {
      logger.level = resolvedLevel
      logger.format = combine(
        colorize(),
        splat(),
        label({ label: DEFAULT_LOGGER_NAME }),
        timestamp({ format: 'HH:mm:ss' }),
        this.getFormatter(),
      )
    })
  }

  public static setDebug(enabled: boolean | 0 | 1 | 2): void {
    let level: LogLevel
    if (enabled === 2 || enabled === true)
      level = 'debug'
    else if (enabled === 1)
      level = 'info'
    else level = 'warn'

    Object.values(this.instances).forEach((logger) => {
      logger.level = level
    })
    process.env.DEBUG = enabled ? (enabled === true ? '2' : String(enabled)) : '0'
  }

  public static setFormat(format: 'minimal' | 'detailed' | 'emoji'): void {
    this.currentFormat = format
    this.configure({ format })
  }
}

Logger.configure()
export const logger = Logger.get()
