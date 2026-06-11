import { Contract } from '../models/Project';

export async function getContractsBySubProject(subId: string): Promise<Contract[]> {
  // TODO: implement contract query by sub-project
  return [];
}

export async function createContract(data: any): Promise<Contract> {
  // TODO: implement contract creation with pre-filing
  throw new Error('Not implemented');
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
  // TODO: implement contract update
  throw new Error('Not implemented');
}

export async function syncContractToHQ(contractId: string): Promise<void> {
  // TODO: implement contract sync to HQ system
}

export async function approveContract(contractId: string): Promise<Contract> {
  // TODO: implement contract approval
  throw new Error('Not implemented');
}
