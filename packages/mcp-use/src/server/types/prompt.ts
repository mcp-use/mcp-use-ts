import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js'
import type { InputDefinition } from './common.js'

export type PromptHandler = (params: Record<string, any>) => Promise<GetPromptResult>

export interface PromptDefinition {
  /** Unique identifier for the prompt */
  name: string
  /** Description of what the prompt does */
  description?: string
  /** Argument definitions */
  args?: InputDefinition[]
  /** Async function that generates the prompt */
  fn: PromptHandler
}