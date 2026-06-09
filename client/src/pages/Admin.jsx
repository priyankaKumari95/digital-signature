import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  ShieldCheck,
  Activity,
  LayoutDashboard,
  History,
} from 'lucide-react';
import { FullPageSpinner } from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { adminApi } from '../api';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../lib/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'audit', label: 'Audit logs', icon: History },
];

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <Icon size={18} className="text-brand-500" />
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Overview() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => toast.error(e.message));
  }, [toast]);
  if (!stats) return <FullPageSpinner />;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Users" value={stats.users.total} hint={`${stats.users.admins} admin(s), ${stats.users.active} active`} />
        <StatCard icon={FileText} label="Documents" value={stats.documents.total} hint={`${stats.documents.pending} pending`} />
        <StatCard icon={ShieldCheck} label="Signed" value={stats.documents.signed} />
        <StatCard icon={Activity} label="Audit events" value={stats.auditEvents} />
      </div>
      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-800">Recent activity</div>
        <ul className="divide-y divide-slate-100">
          {stats.recentActivity.map((a) => (
            <li key={a._id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-slate-700">{a.action}</span>
              <span className="text-slate-400">{a.actor?.email || a.actorEmail || 'anonymous'} · {formatDate(a.createdAt)}</span>
            </li>
          ))}
          {stats.recentActivity.length === 0 && <li className="px-5 py-3 text-sm text-slate-400">No activity yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function UsersTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    try { setData(await adminApi.users()); } catch (e) { toast.error(e.message); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const update = async (u, patch) => {
    try {
      await adminApi.updateUser(u.id, patch);
      toast.success('User updated.');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!data) return <FullPageSpinner />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.items.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><div className="font-medium text-slate-800">{u.name}</div><div className="text-xs text-slate-400">{u.email}</div></td>
              <td className="px-4 py-3"><span className={`badge ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span></td>
              <td className="px-4 py-3"><span className={`badge ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'active' : 'disabled'}</span></td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => update(u, { role: u.role === 'admin' ? 'user' : 'admin' })}>
                    {u.role === 'admin' ? 'Make user' : 'Make admin'}
                  </button>
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => update(u, { isActive: !u.isActive })}>
                    {u.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  useEffect(() => { adminApi.documents().then(setData).catch((e) => toast.error(e.message)); }, [toast]);
  if (!data) return <FullPageSpinner />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.items.map((d) => (
            <tr key={d.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{d.title}</td>
              <td className="px-4 py-3 text-slate-500">{d.owner?.email || '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-3 text-slate-500">{formatDate(d.createdAt)}</td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No documents.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const load = useCallback(async () => {
    try { setData(await adminApi.auditLogs({ page, action: action || undefined })); } catch (e) { toast.error(e.message); }
  }, [page, action, toast]);
  useEffect(() => { load(); }, [load]);
  if (!data) return <FullPageSpinner />;
  return (
    <div>
      <div className="mb-3">
        <select className="input w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {['USER_REGISTERED','USER_LOGGED_IN','USER_LOGIN_FAILED','DOCUMENT_UPLOADED','DOCUMENT_SIGNED','DOCUMENT_DOWNLOADED','DOCUMENT_VERIFIED','SIGNATURE_CREATED','ADMIN_UPDATED_USER'].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">IP</th><th className="px-4 py-3">When</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((log) => (
              <tr key={log._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{log.action}</td>
                <td className="px-4 py-3 text-slate-500">{log.actor?.email || log.actorEmail || 'anonymous'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.ip || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(log.createdAt)}</td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No logs.</td></tr>}
          </tbody>
        </table>
      </div>
      {data.pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-sm text-slate-500">Page {data.pagination.page} of {data.pagination.pages}</span>
          <button className="btn-secondary" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Administration</h1>
      <p className="mb-6 text-sm text-slate-500">Operational visibility into the platform.</p>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <UsersTab />}
      {tab === 'documents' && <DocumentsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}
