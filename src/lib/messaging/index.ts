// ──────────────────────────────────────────────
// Water Purifier Service ERP — Messaging Module
// ──────────────────────────────────────────────

export type { MessagingService } from './interfaces';
export { BaseMessagingService } from './base-messaging.service';
export type {
  Attachment,
  BulkMessageResult,
  MessageChannel,
  MessagePayload,
  SendMessageResult,
  TemplateMessage,
} from './types';

export { WhatsAppService } from './whatsapp.service';
export type { WhatsAppServiceConfig } from './whatsapp.service';

export { SmsService } from './sms.service';
export type { SmsServiceConfig } from './sms.service';

export { EmailService } from './email.service';
export type { EmailServiceConfig } from './email.service';

export { MessagingFactory } from './messaging.factory';
export type { ChannelConfig } from './messaging.factory';

// Template Engine
export {
  KNOWN_VARIABLES,
  renderTemplate,
  extractVariables,
  getUnknownVariables,
} from './template-engine';
export type {
  TemplateVariable,
  VariableValues,
} from './template-engine';

// Variable Resolver (auto-fill from DB)
export { resolveVariables } from './variable-resolver';
export type { ResolveContext } from './variable-resolver';
