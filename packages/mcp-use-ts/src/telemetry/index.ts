import { Telemetry } from './telemetry.js'

export { BaseTelemetryEvent, MCPAgentExecutionEvent, MCPAgentExecutionEventData } from './events.js'
export { Telemetry } from './telemetry.js'
export { extractModelInfo, getModelName, getModelProvider, getPackageVersion } from './utils.js'

// Convenience function to set telemetry source globally
export function setTelemetrySource(source: string): void {
  Telemetry.getInstance().setSource(source)
}
