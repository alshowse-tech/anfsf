import { FastifyInstance } from "fastify";
import { createTicket, getTicket, listTickets, updateTicket, removeTicket } from "../../pipeline/ticket";
import { notifyWebhooks } from "../../pipeline/webhook";

export function registerTicketRoutes(app: FastifyInstance): void {
  app.post("/api/v1/tickets", async (req) => {
    const body=req.body as any;
    if(!body.title||!body.projectId) return {status:"error",error:{code:"MISSING_FIELDS",message:"title, projectId required"}};
    const t=createTicket(body.title,body.description||"",body.projectId,{priority:body.priority,assignee:body.assignee,tags:body.tags});
    notifyWebhooks("ticket.created", t);
    return {status:"ok",ticket:t};
  });

  app.get("/api/v1/tickets", async (req) => {
    const q=req.query as any;
    const tickets=listTickets({projectId:q.projectId,status:q.status,priority:q.priority});
    return {status:"ok",tickets,total:tickets.length};
  });

  app.get("/api/v1/tickets/:id", async (req) => {
    const p=req.params as any;
    const t=getTicket(p.id);
    if(!t) return {status:"error",error:{code:"NOT_FOUND",message:"Ticket not found"}};
    return {status:"ok",ticket:t};
  });

  app.patch("/api/v1/tickets/:id", async (req) => {
    const p=req.params as any;const body=req.body as any;
    const ok=updateTicket(p.id,body);
    if(!ok) return {status:"error",error:{code:"NOT_FOUND",message:"Ticket not found"}};
    return {status:"ok",ticket:getTicket(p.id)};
  });

  app.delete("/api/v1/tickets/:id", async (req) => {
    const p=req.params as any;
    const ok=removeTicket(p.id);
    if(!ok) return {status:"error",error:{code:"NOT_FOUND",message:"Ticket not found"}};
    return {status:"ok"};
  });
}