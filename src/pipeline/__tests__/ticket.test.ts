import { describe, it, expect, beforeEach } from "@jest/globals";
import { createTicket, getTicket, listTickets, updateTicket, removeTicket, clearTickets } from "../ticket";

describe("TicketSystem", () => {
  beforeEach(() => { clearTickets(); });

  it("creates a ticket with defaults", () => {
    const t=createTicket("Fix login bug","Users cannot log in","proj1");
    expect(t.title).toBe("Fix login bug");
    expect(t.status).toBe("open");
    expect(t.priority).toBe("medium");
    expect(t.projectId).toBe("proj1");
    expect(t.id).toBeTruthy();
  });

  it("lists tickets with filters", () => {
    createTicket("T1","d","proj1",{priority:"high"});
    createTicket("T2","d","proj1",{priority:"low"});
    createTicket("T3","d","proj2");
    expect(listTickets({projectId:"proj1"}).length).toBe(2);
    expect(listTickets({projectId:"proj1",priority:"high"}).length).toBe(1);
    expect(listTickets().length).toBe(3);
  });

  it("updates ticket status", () => {
    const t=createTicket("T","d","p1");
    expect(updateTicket(t.id,{status:"in_progress"})).toBe(true);
    expect(getTicket(t.id)!.status).toBe("in_progress");
  });

  it("removes a ticket", () => {
    const t=createTicket("T","d","p1");
    expect(removeTicket(t.id)).toBe(true);
    expect(getTicket(t.id)).toBeUndefined();
    expect(removeTicket("nonexistent")).toBe(false);
  });
});