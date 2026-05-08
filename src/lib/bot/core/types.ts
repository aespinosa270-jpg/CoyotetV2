import type { ClientePerfil } from "../types/domain";
import type { IncomingMessage, OutgoingMessage } from "../types/messages";
import type { Redis } from "@upstash/redis";

export interface BotContext {
  message: IncomingMessage;
  redis: Redis;
  profile: ClientePerfil;
  history: Array<{ role: "user" | "assistant" | "system" | "tool", content: string, tool_call_id?: string, name?: string }>;
  isAdmin: boolean;
  state: {
    shouldAbort: boolean;
    abortReason?: string;
    extractedData?: Record<string, any>;
  };
}

export interface PipelineResult {
  success: boolean;
  messages: OutgoingMessage[];
  error?: string;
}
