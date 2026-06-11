export interface Project {
  project_id: string;
  project_code: string;
  project_name: string;
  budget_amount: number;
  approve_doc_no: string;
  construction_type: string;
  fund_source: string;
  project_type: string;
  responsible_dept: string;
  project_leader: string;
  is_key_project: 'Y' | 'N';
  plan_start_date: string;
  plan_end_date: string;
  sync_method: 'API' | 'EXCEL';
  sync_time: string;
  status: string;
  fiscal_year: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubProject {
  sub_id: string;
  project_id: string;
  sub_name: string;
  sub_type: 'CONSTRUCTION' | 'EQUIPMENT' | 'OTHER';
  sub_budget: number;
  design_status: string;
  bid_method?: string;
  bid_winner?: string;
  bid_amount?: number;
  bid_date?: string;
  plan_start: string;
  plan_end: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface DesignConfirmation {
  design_id: string;
  sub_id: string;
  design_unit: string;
  survey_unit?: string;
  entrust_date: string;
  design_contract_no?: string;
  design_contract_amount?: number;
  survey_contract_no?: string;
  survey_contract_amount?: number;
  drawing_files?: string;
  drawing_submit_date?: string;
  budget_doc_id?: string;
  budget_amount?: number;
  hq_submit_date?: string;
  hq_approve_doc_no?: string;
  hq_approved_amount?: number;
  hq_approve_date?: string;
  review_date?: string;
  reviewer_id?: string;
  review_result?: string;
  confirm_time?: string;
  design_status: string;
}

export interface Contract {
  contract_id: string;
  sub_id: string;
  contract_no: string;
  contract_amount: number;
  sign_date: string;
  payment_terms: string;
  retention_ratio: number;
  synced_to_hq: 'Y' | 'N';
  sync_time?: string;
  approval_status: string;
  contract_file_id: string;
}

export interface ProgressReport {
  report_id: string;
  sub_id: string;
  report_month: string;
  plan_month_amount: number;
  actual_month_amount: number;
  cumulative_completion_pct: number;
  plan_month_value: number;
  contract_payment_ratio: number;
  support_files: string;
  submit_time: string;
  supervisor_id: string;
  supervisor_opinion?: string;
  supervisor_time?: string;
  eng_dept_id: string;
  eng_dept_time?: string;
  confirm_status: string;
}

export interface ProgressPhoto {
  photo_id: string;
  report_id: string;
  photo_url: string;
  photo_time: string;
  gps_location?: string;
  construction_position: string;
  upload_time: string;
}

export interface ChangeVariation {
  change_id: string;
  sub_id: string;
  change_type: string;
  change_description: string;
  cost_impact: number;
  schedule_impact: number;
  apply_time: string;
  approval_status: string;
  approved_cost?: number;
  approval_time?: string;
}

export interface EquipmentArrival {
  arrival_id: string;
  sub_id: string;
  contract_no: string;
  supplier: string;
  equipment_list: any;
  contract_amount: number;
  planned_delivery_date: string;
  actual_arrival_date?: string;
  arrival_check_result?: string;
  missing_items?: string;
  equipment_serial_nos?: string;
  acceptance_person?: string;
  acceptance_date?: string;
  acceptance_opinion?: string;
  status: string;
}

export interface PaymentApplication {
  apply_id: string;
  apply_no: string;
  sub_id: string;
  contract_no: string;
  apply_amount: number;
  cumulative_paid: number;
  contract_balance: number;
  payment_reason: string;
  related_report_id?: string;
  related_acceptance_id?: string;
  invoice_file_ids: string;
  support_file_ids?: string;
  submit_by: string;
  submit_time: string;
  status: string;
}

export interface PaymentPlan {
  plan_id: string;
  plan_month: string;
  dept_type: string;
  dept_submit_by: string;
  dept_submit_time: string;
  total_apply_amount: number;
  selected_apply_ids?: any;
  deferred_apply_ids?: any;
  final_plan_amount?: number;
  select_by?: string;
  select_time?: string;
  approval_status: string;
  oa_flow_id?: string;
  push_finance_time?: string;
}

export interface InvoicePayment {
  record_id: string;
  plan_id: string;
  apply_id: string;
  invoice_no: string;
  invoice_amount: number;
  invoice_image_id: string;
  invoice_confirmed: 'Y' | 'N';
  invoice_confirm_by?: string;
  invoice_confirm_time?: string;
  payment_voucher_no?: string;
  payment_date?: string;
  payment_amount?: number;
  payment_marked: 'Y' | 'N';
  remark?: string;
}

export interface Settlement {
  settlement_id: string;
  sub_id: string;
  completion_report_id: string;
  acceptance_date?: string;
  acceptance_result?: string;
  defect_list?: string;
  settlement_start_date?: string;
  settlement_due_date?: string;
  submitted_amount?: number;
  contract_amount?: number;
  diff_amount?: number;
  diff_reason?: string;
  audit_type: string;
  audit_amount?: number;
  audit_reduction?: number;
  audit_reduction_rate?: number;
  audit_conclusion_time?: string;
  audit_report_id?: string;
  final_amount?: number;
  finalize_date?: string;
  settlement_status: string;
}

export interface Dispute {
  dispute_id: string;
  settlement_id: string;
  dispute_description: string;
  contractor_opinion: string;
  eng_dept_opinion?: string;
  negotiation_record?: string;
  resolution?: string;
  status: string;
  initiate_time: string;
  resolve_time?: string;
}

export interface YearRollover {
  rollover_id: string;
  project_id: string;
  from_year: number;
  to_year: number;
  rollover_date: string;
  uncompleted_sub_count: number;
  unsettled_amount: number;
  rollover_status: string;
}

export interface ProjectCancel {
  cancel_id: string;
  project_id: string;
  cancel_date: string;
  cancel_doc_no: string;
  final_total_cost: number;
  budget_balance: number;
  balance_handling: string;
}
