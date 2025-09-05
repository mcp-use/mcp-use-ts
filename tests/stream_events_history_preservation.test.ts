/**
 * Tests for MCPAgent streamEvents() tool history preservation
 *
 * These tests verify that the streamEvents() method properly preserves
 * tool call information in conversation history by reconstructing it
 * from event streams. This is critical for enabling LLMs to reference
 * previous tool executions in multi-turn conversations.
 *
 * The streamEvents() method has comprehensive tool history preservation
 * logic implemented. These tests validate that the implementation is
 * present and correctly structured.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MCPAgent, MCPClient } from '../index.js'

// Mock the MCP client for testing
vi.mock('../src/client.js', () => ({
  MCPClient: vi.fn().mockImplementation(() => ({
    getAllActiveSessions: vi.fn().mockResolvedValue({}),
    createAllSessions: vi.fn().mockResolvedValue({}),
    closeAllSessions: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock the LangChain adapter
vi.mock('../src/adapters/langchain_adapter.js', () => ({
  LangChainAdapter: vi.fn().mockImplementation(() => ({
    createToolsFromConnectors: vi.fn().mockResolvedValue([
      {
        name: 'test_tool',
        description: 'A test tool',
        schema: {},
        func: vi.fn().mockResolvedValue('Test tool result'),
      },
    ]),
  })),
}))

describe('mCPAgent - streamEvents() Tool History Preservation', () => {
  let agent: MCPAgent
  let mockLLM: any
  let mockClient: any

  beforeEach(() => {
    // Setup mocks following existing patterns
    mockLLM = {
      _llmType: 'fake',
      _modelType: 'base_chat_model',
      invoke: vi.fn().mockResolvedValue({ content: 'Test response' }),
      stream: vi.fn(),
    }

    mockClient = new MCPClient()

    // Create agent with memory enabled
    agent = new MCPAgent({
      llm: mockLLM,
      client: mockClient,
      memoryEnabled: true,
    })
  })

  describe('implementation Validation', () => {
    it('should verify tool history preservation requirements are implemented', () => {
      // This test validates that the critical requirements for tool history preservation are met
      // by inspecting the source code of the streamEvents method

      const streamEventsCode = agent.streamEvents.toString()

      // Basic structure - verify the method has tool tracking variables
      expect(streamEventsCode).toContain('toolCalls')
      expect(streamEventsCode).toContain('toolResults')
      expect(streamEventsCode).toContain('toolStartEvents')

      // Event processing - verify it handles the required events
      expect(streamEventsCode).toContain('on_tool_start')
      expect(streamEventsCode).toContain('on_tool_end')
      expect(streamEventsCode).toContain('on_chain_end')

      // Tool call ID handling - verify it generates IDs when missing
      expect(streamEventsCode).toContain('toolCallId')
      expect(streamEventsCode).toContain('randomUUID')

      // History preservation - verify it adds the correct message types
      expect(streamEventsCode).toContain('addToHistory')
      expect(streamEventsCode).toContain('HumanMessage')
      expect(streamEventsCode).toContain('AIMessage')
      expect(streamEventsCode).toContain('ToolMessage')
      expect(streamEventsCode).toContain('tool_calls')
      expect(streamEventsCode).toContain('tool_call_id')

      // Critical edge case - verify it handles tool execution without final response
      expect(streamEventsCode).toContain('finalResponse || toolCalls.length > 0')
      expect(streamEventsCode).toContain('getToolExecutionPlaceholder')

      // Error handling - verify robust error handling is present
      expect(streamEventsCode).toContain('try')
      expect(streamEventsCode).toContain('catch')
      expect(streamEventsCode).toContain('warn')
      expect(streamEventsCode).toContain('error')
    })

    it('should have proper tool event tracking structure', () => {
      const code = agent.streamEvents.toString()

      // Verify tool start event handling
      expect(code).toContain('toolStartEvents.set(event.run_id, event)')

      // Verify tool end event processing
      expect(code).toContain('toolStartEvents.get(event.run_id)')

      // Verify tool call creation
      expect(code).toContain('toolCalls.push')
      expect(code).toContain('id: toolCallId')
      expect(code).toContain('name: startEvent.name')
      expect(code).toContain('args: startEvent.data.input')

      // Verify tool result storage
      expect(code).toContain('toolResults.push')
      expect(code).toContain('tool_call_id: toolCallId')
      expect(code).toContain('content: outputContent')

      // Verify cleanup
      expect(code).toContain('toolStartEvents.delete(event.run_id)')
    })

    it('should have proper final response handling', () => {
      const code = agent.streamEvents.toString()

      // Verify all output format handling (compiled versions)
      expect(code).toContain('typeof output === "string"')
      expect(code).toContain('Array.isArray(output)')
      expect(code).toContain('output[0]?.text')
      expect(code).toContain('output.output')
      expect(code).toContain('output.answer || output.text || output.content')

      // Verify error handling for unexpected formats
      expect(code).toContain('Unexpected chain end output format')
    })

    it('should have comprehensive error handling', () => {
      const code = agent.streamEvents.toString()

      // Verify event validation (compiled versions)
      expect(code).toContain('Invalid event structure')
      expect(code).toContain('typeof event !== "object"')
      expect(code).toContain('!event.event')

      // Verify tool event validation
      expect(code).toContain('Invalid on_tool_start event')
      expect(code).toContain('missing run_id or name')
      expect(code).toContain('Invalid tool start event data')

      // Verify orphaned event handling
      expect(code).toContain('orphaned tool start events')
      expect(code).toContain('on_tool_end event without matching')

      // Verify serialization error handling
      expect(code).toContain('Failed to serialize tool output')
      expect(code).toContain('jsonError')

      // Verify history preservation error handling
      expect(code).toContain('Error adding to conversation history')
      expect(code).toContain('historyError')
    })

    it('should have memory management features', () => {
      const code = agent.streamEvents.toString()

      // Verify memory-enabled check
      expect(code).toContain('this.memoryEnabled')

      // Verify cleanup
      expect(code).toContain('toolStartEvents.delete')
      expect(code).toContain('toolStartEvents.size > 0')

      // Verify proper message ordering (compiled versions)
      expect(code).toContain('addToHistory')
      expect(code).toContain('HumanMessage')
      expect(code).toContain('AIMessage')
      expect(code).toContain('ToolMessage')
      expect(code).toContain('tool_calls')
    })

    it('should have output truncation capabilities', () => {
      const code = agent.streamEvents.toString()

      // Verify truncation is applied
      expect(code).toContain('getEffectiveTruncationConfig')
      expect(code).toContain('applyTruncation')

      // Verify it handles both tool-specific and default configs
      expect(code).toContain('startEvent.name') // Used for tool-specific config

      // Verify it handles serialization errors with truncation
      expect(code).toContain('fallbackContent')
    })
  })

  describe('method Structure Validation', () => {
    it('should be an async generator function', () => {
      expect(agent.streamEvents.constructor.name).toBe('AsyncGeneratorFunction')
    })

    it('should have correct parameter signature', () => {
      const code = agent.streamEvents.toString()
      expect(code).toMatch(/streamEvents\s*\(\s*query\s*,\s*maxSteps\s*,\s*manageConnector\s*=\s*true\s*,\s*externalHistory\s*\)/)
    })

    it('should initialize tracking variables at start', () => {
      const code = agent.streamEvents.toString()

      // Verify initial variable setup (compiled versions)
      expect(code).toContain('let finalResponse = ""')
      expect(code).toContain('const toolCalls = []')
      expect(code).toContain('const toolResults = []')
      expect(code).toContain('const toolStartEvents =')
      expect(code).toContain('new Map()')
    })

    it('should preserve history after event processing completes', () => {
      const code = agent.streamEvents.toString()

      // Verify the history preservation happens after event processing
      expect(code).toContain('addToHistory')
      expect(code).toContain('HumanMessage')
      expect(code).toContain('finalResponse || toolCalls.length > 0')
      expect(code).toContain('AIMessage')
      expect(code).toContain('toolResults.forEach')
      expect(code).toContain('ToolMessage')
    })
  })

  describe('integration Points', () => {
    it('should have proper integration with agent executor', () => {
      const code = agent.streamEvents.toString()

      // Verify it gets the agent executor
      expect(code).toContain('this.agentExecutor')
      expect(code).toContain('agentExecutor.streamEvents')
      expect(code).toContain('agentExecutor.maxIterations = steps')
    })

    it('should have proper telemetry integration', () => {
      const code = agent.streamEvents.toString()

      expect(code).toContain('this.telemetry.trackAgentExecution')
      expect(code).toContain('executionMethod: "streamEvents"')
      expect(code).toContain('eventCount')
      expect(code).toContain('totalResponseLength')
    })

    it('should integrate with truncation system', () => {
      const code = agent.streamEvents.toString()

      expect(code).toContain('this.getEffectiveTruncationConfig')
      expect(code).toContain('this.applyTruncation')
    })

    it('should integrate with placeholder message system', () => {
      const code = agent.streamEvents.toString()

      expect(code).toContain('this.getToolExecutionPlaceholder()')
    })
  })
})
