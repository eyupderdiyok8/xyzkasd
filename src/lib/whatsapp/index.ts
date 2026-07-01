// ──────────────────────────────────────────────
// Water Purifier Service ERP — WhatsApp Module
// ──────────────────────────────────────────────

export { WahaSessionManager, getWahaManager } from './waha-manager';
export type {
  WahaSessionStatus,
  WahaHealthCheck,
  WhatsAppConnectionStatus,
} from './waha-manager';

export {
  buildMaintenanceReminderText,
  buildSurveyInvitationText,
  buildHighScoreThanksText,
  buildLowScoreNotificationText,
} from './notify';
