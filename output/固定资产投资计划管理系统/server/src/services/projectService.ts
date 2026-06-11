import { Project, SubProject } from '../models/Project';

// TODO: implement database connection and query logic

export async function getProjects(filters: any): Promise<Project[]> {
  // TODO: implement project query with filters
  return [];
}

export async function getProjectById(id: string): Promise<Project | null> {
  // TODO: implement project detail query
  return null;
}

export async function createProject(data: Omit<Project, 'project_id' | 'created_at' | 'updated_at'>): Promise<Project> {
  // TODO: implement project creation with validation
  throw new Error('Not implemented');
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  // TODO: implement project update
  throw new Error('Not implemented');
}

export async function deleteProject(id: string): Promise<void> {
  // TODO: implement soft delete
}

export async function syncProjectsFromHQ(): Promise<Project[]> {
  // TODO: implement API sync from HQ system
  return [];
}

export async function importProjectsFromExcel(filePath: string): Promise<Project[]> {
  // TODO: implement Excel import with validation
  return [];
}

export async function toggleKeyProject(id: string): Promise<Project> {
  // TODO: implement toggle key project flag
  throw new Error('Not implemented');
}

export async function getSubProjectsByProjectId(projectId: string): Promise<SubProject[]> {
  // TODO: implement sub-project query by project ID
  return [];
}

export async function createSubProject(data: any): Promise<SubProject> {
  // TODO: implement sub-project creation with budget validation
  throw new Error('Not implemented');
}

export async function startSubProject(id: string): Promise<SubProject> {
  // TODO: implement sub-project start with condition check
  throw new Error('Not implemented');
}

export async function validateSubProjectBudget(projectId: string, newSubBudget: number): Promise<boolean> {
  // TODO: implement budget validation against project budget
  return true;
}
