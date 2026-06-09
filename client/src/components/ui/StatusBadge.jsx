import { STATUS_META } from '../../lib/format';

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
