/**
 * ANFSF Pipeline ? Ticket System (GAP-14)
 * Standalone work order / ticket tracking system.
 */

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee?: string;
  projectId: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

let _tickets: Ticket[] = [];

export function createTicket(title: string, description: string, projectId: string, opts?: {
  priority?: TicketPriority; assignee?: string; tags?: string[];
}): Ticket {
  const id="tkt_"+Math.random().toString(36).slice(2,10)+"_"+Date.now();
  const now=Date.now();
  let t: Ticket = { id, title, description, status: "open", priority: opts?.priority || "medium", projectId, tags: opts?.tags || [], createdAt: now, updatedAt: now };
  if(opts?.assignee) t.assignee=opts.assignee;
  _tickets.push(t);
  return t;
}

export function getTicket(id: string): Ticket | undefined {
  return _tickets.find(t => t.id === id);
}

export function listTickets(filter?: { projectId?: string; status?: TicketStatus; priority?: TicketPriority }): Ticket[] {
  let r=_tickets.slice();
  if(filter?.projectId) r=r.filter(t=>t.projectId===filter.projectId);
  if(filter?.status) r=r.filter(t=>t.status===filter.status);
  if(filter?.priority) r=r.filter(t=>t.priority===filter.priority);
  return r.sort((a,b)=>b.createdAt-a.createdAt);
}

export function updateTicket(id: string, changes: Partial<Omit<Ticket,"id"|"createdAt"|"projectId">>): boolean {
  const t=_tickets.find(t=>t.id===id);
  if(!t) return false;
  Object.assign(t,changes,{updatedAt:Date.now()});
  return true;
}

export function removeTicket(id: string): boolean {
  let idx=_tickets.findIndex(t=>t.id===id);
  if(idx<0) return false;
  _tickets.splice(idx,1);
  return true;
}

export function clearTickets(): void { _tickets=[]; }