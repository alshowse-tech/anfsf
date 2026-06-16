import { useState, useEffect } from "react";
import { t } from "../i18n";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";
const ROLES = ["admin", "pm", "frontend", "backend", "qa", "devops", "viewer"];

export default function MemberManager() {
  const [tenants, setTenants] = useState<{id:string;name:string}[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [members, setMembers] = useState<{userId:string;role:string;isLead:boolean}[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [message, setMessage] = useState("");

  const fetchTenants = async () => {
    try { const r=await fetch(API_BASE+"/api/v1/tenants");const d=await r.json();if(d.tenants){setTenants(d.tenants);if(!tenantId&&d.tenants.length>0)setTenantId(d.tenants[0].id);} } catch {}
  };
  const fetchMembers = async () => {
    if(!tenantId)return; try { const r=await fetch(API_BASE+"/api/v1/tenants/"+tenantId+"/members");const d=await r.json();if(d.members)setMembers(d.members); } catch {}
  };

  useEffect(()=>{fetchTenants();},[]);
  useEffect(()=>{if(tenantId)fetchMembers();},[tenantId]);

  const addMember = async()=>{
    if(!newUserId||!newRole||!tenantId)return;
    try{
      const r=await fetch(API_BASE+"/api/v1/tenants/"+tenantId+"/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:newUserId,role:newRole})});
      const d=await r.json(); if(d.members){setMembers(d.members);setNewUserId("");setMessage(t("Member added"));}else{setMessage("Error: "+(d.error?.message||"Failed"));}
    }catch(e){setMessage("Error: "+String(e));}
  };
  const removeMember = async(userId:string)=>{ try{await fetch(API_BASE+"/api/v1/tenants/"+tenantId+"/members/"+userId,{method:"DELETE"});fetchMembers();}catch{} };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">{t("Member Management")}</h3>
      <div><label className="block text-xs text-gray-500 mb-1">{t("Tenant")}</label>
        <select value={tenantId} onChange={e=>setTenantId(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm">
          {tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select></div>
      <div className="space-y-2">
        {members.map(m=>(
          <div key={m.userId} className="flex items-center justify-between border rounded-lg p-2">
            <div><span className="text-sm font-medium text-gray-900">{m.userId}</span>
              <span className={"ml-2 px-1.5 py-0.5 rounded text-xs "+(m.role==="admin"?"bg-red-100 text-red-700":"bg-gray-100 text-gray-600")}>{m.role}</span>
              {m.isLead&&<span className="ml-1 text-xs text-yellow-600">Lead</span>}</div>
            <button onClick={()=>removeMember(m.userId)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">{t("Remove")}</button>
          </div>
        ))}
        {members.length===0&&<p className="text-xs text-gray-500 py-4 text-center">{t("No members")}</p>}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">{t("User ID")}</label>
          <input value={newUserId} onChange={e=>setNewUserId(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" placeholder={t("User ID")} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">{t("Role")}</label>
          <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
            {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
          </select></div>
        <button onClick={addMember} disabled={!newUserId} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">{t("Add")}</button>
      </div>
      {message&&<p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}