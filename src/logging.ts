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

const defaultFormatter = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`
})

export class Logger {
  private static instances: Record<string, WinstonLogger> = {}

  public static get(name: string = DEFAULT_LOGGER_NAME): WinstonLogger {
    if (!this.instances[name]) {
      this.instances[name] = createLogger({
        level: resolveLevel(process.env.DEBUG),
        format: combine(
          colorize(),
          splat(),
          label({ label: name }),
          timestamp(),
          defaultFormatter,
        ),
        transports: [],
      })
    }

    return this.instances[name]
  }

  public static configure(options: LoggerOptions = {}): void {
    const { level, console = true, file } = options
    const resolvedLevel = level ?? resolveLevel(process.env.DEBUG)

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
}

Logger.configure()
export const logger = Logger.get()
