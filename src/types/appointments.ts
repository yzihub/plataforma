// ─── Appointment Types ────────────────────────────────────────────────────────
// Módulo genérico de calendário operacional do YZI OS.
// Ref: supabase/migrations/021_appointments_table.sql

export type AppointmentType =
  | 'visita'
  | 'reuniao'
  | 'retorno'
  | 'consulta'
  | 'outro';

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'realizado'
  | 'cancelado'
  | 'reagendado';

export type IntegrationProvider = 'google_calendar' | 'n8n' | null;

export type IntegrationStatus = 'pendente' | 'configurado' | 'sincronizado' | 'erro';

// ─── Main Entity ──────────────────────────────────────────────────────────────

export interface Appointment {
  id:                   string;
  tenant_id:            string;
  title:                string;
  appointment_type:     AppointmentType;
  status:               AppointmentStatus;
  lead_id:              string | null;
  broker_id:            string | null;
  start_at:             string;   // ISO 8601
  end_at:               string | null;
  location:             string | null;
  description:          string | null;
  integration_provider: IntegrationProvider;
  integration_status:   IntegrationStatus;
  external_event_id:    string | null;
  metadata:             Record<string, unknown>;
  created_at:           string;
  updated_at:           string;
}

// ─── Input para criação (sem campos gerados pelo servidor) ────────────────────

export interface NewAppointmentInput {
  title:            string;
  appointment_type: AppointmentType;
  status?:          AppointmentStatus;
  lead_id?:         string | null;
  broker_id?:       string | null;
  start_at:         string;
  end_at?:          string | null;
  location?:        string | null;
  description?:     string | null;
}

// ─── Labels em pt-BR ─────────────────────────────────────────────────────────

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  visita:   'Visita',
  reuniao:  'Reunião',
  retorno:  'Retorno',
  consulta: 'Consulta',
  outro:    'Outro',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado:   'Agendado',
  confirmado: 'Confirmado',
  realizado:  'Realizado',
  cancelado:  'Cancelado',
  reagendado: 'Reagendado',
};
