// [generated]
// TODO: implement shared type definitions

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  description?: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: PlanItem[];
}

export interface PlanItem {
  id: string;
  planId: string;
  name: string;
  description?: string;
  amount: number;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
