// [generated]
import { API_BASE_URL } from '../utils/constants';
import type { Project, AnnualPlan, Approval } from '../types';

// TODO: implement actual API calls with proper error handling

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  // TODO: implement token handling, error handling
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchProjects(): Promise<Project[]> {
  // TODO: implement
  return request<Project[]>('/projects');
}

export async function fetchProject(id: string): Promise<Project> {
  // TODO: implement
  return request<Project>(`/projects/${id}`);
}

export async function fetchAnnualPlans(year?: number): Promise<AnnualPlan[]> {
  // TODO: implement
  const query = year ? `?year=${year}` : '';
  return request<AnnualPlan[]>(`/plans${query}`);
}

export async function submitApproval(entityType: string, entityId: string): Promise<Approval> {
  // TODO: implement
  return request<Approval>('/approvals', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId }),
  });
}
