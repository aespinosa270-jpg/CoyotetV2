export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  type: "text" | "image" | "interactive";
  text?: string;
  imageUrl?: string;
  buttons?: Array<{ payload: string; label: string }>;
  timestamp: Date;
  pending?: boolean;
  error?: boolean;
}
