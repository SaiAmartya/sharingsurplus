export type TextMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

export type ToolCallMessage = {
  id: string;
  role: 'tool-call';
  name: string;
  args: Record<string, unknown>;
  toolCallId: string;
};

export type ToolResponseMessage = {
  id: string;
  role: 'tool';
  name: string;
  response: Record<string, unknown>;
  toolCallId: string;
};

export type ChatMessage = TextMessage | ToolCallMessage | ToolResponseMessage;
