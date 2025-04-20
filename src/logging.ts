import type { Logger as WinstonLogger } from 'winston'
import fs from 'node:fs'
import path from 'node:path'
import { createLogger, format, transports } from 'winston'

const { combine, timestamp, label, printf } = format

let MCP_USE_DEBUG = 0

const debugEnv = process.env.DEBUG?.toLowerCase()
if (debugEnv === '2') {
  MCP_USE_DEBUG = 2
}
else if (debugEnv === '1') {
  MCP_USE_DEBUG = 1
}

const defaultFormat = printf(({ level, message, label, timestamp }) =>
  `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`,
)

export class Logger {
  private static loggers: Record<string, WinstonLogger> = {}

  public static getLogger(name: string = 'mcp_use'): WinstonLogger {
    if (!this.loggers[name]) {
      this.loggers[name] = createLogger({
        level: 'warn',
        format: combine(
          label({ label: name }),
          timestamp(),
          defaultFormat,
        ),
        transports: [],
      })
    }
    return this.loggers[name]
  }

  public static configure(
    level?: string,
    toConsole: boolean = true,
    toFile?: string,
  ): void {
    const root = this.getLogger()

    if (!level) {
      level
        = MCP_USE_DEBUG === 2
          ? 'debug'
          : MCP_USE_DEBUG === 1 ? 'info' : 'warn'
    }
    root.level = level

    root.clear()

    if (toConsole) {
      root.add(new transports.Console())
    }

    if (toFile) {
      const dir = path.dirname(toFile)
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      root.add(new transports.File({ filename: toFile }))
    }
  }

  public static setDebug(debugLevel: number = 2): void {
    MCP_USE_DEBUG = debugLevel

    process.env.LANGCHAIN_VERBOSE = debugLevel >= 1 ? 'true' : 'false'

    const newLevel
      = debugLevel === 2
        ? 'debug'
        : debugLevel === 1 ? 'info' : 'warn'
    Object.values(this.loggers).forEach((log) => {
      log.level = newLevel
    })
  }
}

Logger.configure()

export const logger = Logger.getLogger()
