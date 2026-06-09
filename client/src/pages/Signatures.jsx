import { useState, useEffect } from 'react';
import { PenTool, Trash2, Plus, Star } from 'lucide-react';
import Modal from '../components/ui/Modal';
import SignaturePad from '../components/SignaturePad';
import EmptyState from '../components/ui/EmptyState';
import { FullPageSpinner } from '../components/ui/Spinner';
import { signatureApi } from '../api';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../lib/format';

export default function Signatures() {
  const toast = useToast();
  const [sigs, setSigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSigs(await signatureApi.list());
    } catch (err) {
      toast.error(err.message || 'Failed to load signatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async ({ dataUrl, name, type }) => {
    if (!name) {
      toast.error('Please give your signature a name.');
      return;
    }
    try {
      await signatureApi.create({ name, type, dataUrl, isDefault: makeDefault });
      toast.success('Signature saved.');
      setOpen(false);
      setMakeDefault(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not save signature');
    }
  };

  const remove = async (sig) => {
    if (!window.confirm(`Delete signature "${sig.name}"?`)) return;
    try {
      await signatureApi.remove(sig.id);
      toast.success('Signature deleted.');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Signatures</h1>
          <p className="text-sm text-slate-500">Save signatures once and reuse them when signing documents.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> New signature</button>
      </div>

      {loading ? (
        <FullPageSpinner />
      ) : sigs.length === 0 ? (
        <EmptyState
          icon={PenTool}
          title="No signatures yet"
          description="Create a reusable signature by drawing or typing it."
          action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New signature</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sigs.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{s.name}</span>
                  {s.isDefault && (
                    <span className="badge bg-amber-100 text-amber-800"><Star size={11} className="mr-1" /> Default</span>
                  )}
                </div>
                <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={() => remove(s)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                <img src={s.dataUrl} alt={s.name} className="max-h-full max-w-full object-contain p-2" />
              </div>
              <p className="mt-2 text-xs text-slate-400">Added {formatDate(s.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create a signature">
        <SignaturePad showName saveLabel="Save signature" onSave={create} />
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
          Set as my default signature
        </label>
      </Modal>
    </div>
  );
}
