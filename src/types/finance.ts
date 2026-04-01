export interface FinanceRecord {
  id: string;
  tenant_id: string;
  final_amount: number;
  financial_alert: boolean;
  priority_flag: boolean;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
}
