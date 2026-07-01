// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Engine Types
// Multi-Tenant SaaS
//
// Event-driven automation: trigger → condition → action
// ──────────────────────────────────────────────

/** Supported event triggers */
export type AutomationTrigger =
  | 'service.completed'
  | 'service.assigned'
  | 'maintenance.due'
  | 'device.registered'
  | 'customer.created'
  | 'filter.change.due'
  | 'survey.response'
  | 'ticket.status.changed';

/** Comparison operators for conditions */
export type ConditionOperator =
  | 'eq'        // equals
  | 'neq'       // not equal
  | 'contains'  // string contains
  | 'gt'        // greater than (number/date)
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'in'        // value in list
  | 'nin'       // value not in list
  | 'exists'    // field exists/truthy
  | 'notExists';// field missing/falsy

/** A single condition in a rule */
export interface Condition {
  /** Field path in the trigger context, e.g. "customer.tags" or "device.model" */
  field: string;
  operator: ConditionOperator;
  /** Value to compare against (type depends on operator) */
  value: unknown;
}

/** Supported action types */
export type ActionType =
  | 'wait'
  | 'sendMessage'
  | 'sendSurvey'
  | 'createTicket'
  | 'notifyTechnician'
  | 'updateEntity'
  | 'webhook';

/** Parameters shared by all action types */
export interface BaseActionParams {
  /** Optional label for this action step (for logs) */
  label?: string;
}

/** wait: delay before next action */
export interface WaitActionParams extends BaseActionParams {
  type: 'wait';
  /** Duration value */
  amount: number;
  /** Time unit */
  unit: 'minutes' | 'hours' | 'days';
}

/** sendMessage: send via messaging channel */
export interface SendMessageActionParams extends BaseActionParams {
  type: 'sendMessage';
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  /** MessageTemplate ID to render */
  templateId: string;
  /** Recipient: phone/email or a context path like "customer.phone" */
  to: string;
  /** If true, 'to' is a JSON path into trigger context */
  toIsContextPath?: boolean;
}

/** sendSurvey: send satisfaction survey */
export interface SendSurveyActionParams extends BaseActionParams {
  type: 'sendSurvey';
  /** Survey template / type identifier */
  surveyType?: string;
  /** Phone/email or context path */
  to: string;
  toIsContextPath?: boolean;
}

/** createTicket: auto-create service ticket */
export interface CreateTicketActionParams extends BaseActionParams {
  type: 'createTicket';
  issueDesc: string;
  /** Context path for deviceId, e.g. "device.id" */
  deviceIdPath: string;
  /** Context path for customerId */
  customerIdPath: string;
  /** Optional priority */
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

/** notifyTechnician: notify assigned technician via WhatsApp */
export interface NotifyTechnicianActionParams extends BaseActionParams {
  type: 'notifyTechnician';
  /** Message to send */
  message: string;
  /** Context path for technician ID (default: "ticket.technicianId") */
  technicianIdPath?: string;
}

/** updateEntity: update a field on the trigger entity */
export interface UpdateEntityActionParams extends BaseActionParams {
  type: 'updateEntity';
  /** Entity path in context, e.g. "service_ticket" */
  entity: string;
  field: string;
  value: unknown;
}

/** webhook: call an external URL */
export interface WebhookActionParams extends BaseActionParams {
  type: 'webhook';
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  /** JSON template for the body (supports {{context.path}} substitution) */
  bodyTemplate?: string;
  headers?: Record<string, string>;
}

/** Union of all action parameter types */
export type ActionParams =
  | WaitActionParams
  | SendMessageActionParams
  | SendSurveyActionParams
  | CreateTicketActionParams
  | NotifyTechnicianActionParams
  | UpdateEntityActionParams
  | WebhookActionParams;

/** A rule action — discrimated by `type` */
export interface RuleAction {
  type: ActionType;
  /** Action-specific parameters (ActionParams without the type field) */
  params: Record<string, unknown>;
}

/** Input for creating an automation rule */
export interface CreateRuleInput {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions?: Condition[];
  actions: RuleAction[];
  isActive?: boolean;
  priority?: number;
  cooldownMin?: number;
}

/** Input for updating an automation rule */
export interface UpdateRuleInput {
  name?: string;
  description?: string;
  trigger?: AutomationTrigger;
  conditions?: Condition[];
  actions?: RuleAction[];
  isActive?: boolean;
  priority?: number;
  cooldownMin?: number;
}

/** Trigger context payload — passed to the engine when an event fires */
export interface TriggerContext {
  /** The event trigger key */
  trigger: AutomationTrigger;
  /** Timestamp of the event */
  timestamp: Date;
  /** Tenant ID */
  tenantId: string;
  /** Entity type (e.g. "service_ticket", "device", "customer") */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Free-form event data accessible by conditions and actions */
  data: Record<string, unknown>;
}

/** Result of evaluating a single rule */
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  conditionsMet: boolean;
  actionsExecuted: number;
  actionsFailed: number;
  logId: string;
  error?: string;
}

/** Result of firing a trigger against all matching rules */
export interface TriggerFireResult {
  trigger: AutomationTrigger;
  entityType: string;
  entityId: string;
  rulesMatched: number;
  rulesExecuted: RuleEvaluationResult[];
}
