import { RunnableFunc } from "@langchain/core/runnables";
import { DynamicTool, ToolRunnableConfig } from "@langchain/core/tools";
import OpenAI from "openai";
export type CustomToolFields = Omit<OpenAI.Responses.CustomTool, "type">;
export declare function customTool(func: RunnableFunc<string, string, ToolRunnableConfig>, fields: CustomToolFields): DynamicTool<string>;
