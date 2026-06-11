import { PaymentApplication, PaymentPlan, InvoicePayment } from '../models/Project';

export async function createPaymentApplication(data: any): Promise<PaymentApplication> {
  // TODO: implement contractor payment application
  throw new Error('Not implemented');
}

export async function getPaymentApplications(subId: string): Promise<PaymentApplication[]> {
  // TODO: implement payment application query
  return [];
}

export async function submitDepartmentPlan(data: any): Promise<PaymentPlan> {
  // TODO: implement department monthly plan submission
  throw new Error('Not implemented');
}

export async function getPendingPlans(): Promise<PaymentPlan[]> {
  // TODO: implement pending plans query for planning dept
  return [];
}

export async function selectPlanItems(planId: string, selectedIds: string[], deferredIds: string[]): Promise<PaymentPlan> {
  // TODO: implement planning dept selection
  throw new Error('Not implemented');
}

export async function submitPlanForApproval(planId: string): Promise<PaymentPlan> {
  // TODO: implement plan submission for approval
  throw new Error('Not implemented');
}

export async function approvePaymentPlan(planId: string): Promise<PaymentPlan> {
  // TODO: implement plan approval
  throw new Error('Not implemented');
}

export async function confirmInvoice(recordId: string, confirmedBy: string): Promise<InvoicePayment> {
  // TODO: implement invoice confirmation
  throw new Error('Not implemented');
}

export async function markPaymentCompleted(recordId: string, voucherNo: string, paymentDate: string, amount: number): Promise<InvoicePayment> {
  // TODO: implement payment completion marking
  throw new Error('Not implemented');
}

export async function getPaymentComparison(planId: string): Promise<any> {
  // TODO: implement payment plan vs actual comparison
  throw new Error('Not implemented');
}
