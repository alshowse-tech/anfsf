import { EquipmentArrival } from '../models/Project';

export async function getEquipmentArrivals(subId: string): Promise<EquipmentArrival[]> {
  // TODO: implement equipment arrival query
  return [];
}

export async function syncEquipmentContract(data: any): Promise<EquipmentArrival> {
  // TODO: implement contract sync from external platform and auto-create sub-project
  throw new Error('Not implemented');
}

export async function registerArrival(data: any): Promise<EquipmentArrival> {
  // TODO: implement arrival registration with checklist comparison
  throw new Error('Not implemented');
}

export async function acceptEquipment(arrivalId: string, acceptanceData: any): Promise<EquipmentArrival> {
  // TODO: implement equipment acceptance
  throw new Error('Not implemented');
}
