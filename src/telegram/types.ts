export type TelegramFile = {
  file_id: string;
  file_unique_id?: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
  file_name?: string;
};
export type TelegramMessage = {
  message_id: number;
  date: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name: string; username?: string };
  text?: string;
  caption?: string;
  voice?: TelegramFile;
  audio?: TelegramFile;
  document?: TelegramFile;
};
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};
export type NormalizedSubmission = {
  updateId: string;
  messageId: string;
  chatId: string;
  userId: string;
  userLabel: string;
  text: string | null;
  file: (TelegramFile & { kind: "voice" | "audio" | "document" }) | null;
  documentMetadata: string | null;
};
