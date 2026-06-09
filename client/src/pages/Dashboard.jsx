import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Trash2,
  PenLine,
  Download,
  ShieldCheck,
  Search,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Spinner, { FullPageSpinner } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import { documentApi } from '../api';
import { useToast } from '../context/ToastContext';
import { formatDate, formatBytes, saveBlob } from '../lib/format';

function UploadModal({ open, onClose, onUploaded }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setFile(null);
    setTitle('');
    setProgress(0);
    setUploading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please choose a PDF file.');
      return;
    }
    setUploading(true);
    try {
      const doc = await documentApi.upload(file, title, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      toast.success('Document uploaded.');
      reset();
      onUploaded(doc);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={uploading ? undefined : () => { reset(); onClose(); }} title="Upload a PDF">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">PDF file</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          {file && <p className="mt-1 text-xs text-slate-400">{file.name} · {formatBytes(file.size)}</p>}
        </div>
        <div>
          <label className="label">Title (optional)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to the file name" />
        </div>
        {uploading && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={!file || uploading}>
          {uploading ? <Spinner size={16} /> : <UploadCloud size={16} />}
          {uploading ? `Uploading… ${progress}%` : 'Upload'}
        </button>
      </form>
    </Modal>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentApi.list({ page, status: status || undefined, q: q || undefined });
      setDocs(data.items);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [page, status, q, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await documentApi.remove(doc.id);
      toast.success('Document deleted.');
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const onDownload = async (doc) => {
    try {
      const blob = await documentApi.downloadBlob(doc.id, 'signed');
      saveBlob(blob, `${doc.title}-signed.pdf`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
          <p className="text-sm text-slate-500">Upload, sign, and manage your PDF documents.</p>
        </div>
        <button className="btn-primary" onClick={() => setUploadOpen(true)}>
          <UploadCloud size={18} /> Upload document
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by title…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="uploaded">Uploaded</option>
          <option value="in_progress">In progress</option>
          <option value="signed">Signed</option>
        </select>
      </div>

      {loading ? (
        <FullPageSpinner />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload your first PDF to start signing and managing documents."
          action={<button className="btn-primary" onClick={() => setUploadOpen(true)}><UploadCloud size={16} /> Upload document</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 sm:table-cell">Pages</th>
                <th className="hidden px-4 py-3 md:table-cell">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/documents/${doc.id}`)} className="flex items-center gap-2 text-left font-medium text-slate-800 hover:text-brand-700">
                      <FileText size={16} className="text-slate-400" /> {doc.title}
                    </button>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{doc.pageCount}</td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {doc.status === 'signed' ? (
                        <>
                          <button title="Download signed" className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700" onClick={() => onDownload(doc)}>
                            <Download size={16} />
                          </button>
                          <a title="Verify" href={`/verify/${doc.verificationId}`} target="_blank" rel="noreferrer" className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-green-700">
                            <ShieldCheck size={16} />
                          </a>
                        </>
                      ) : (
                        <button title="Sign" className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-700" onClick={() => navigate(`/documents/${doc.id}`)}>
                          <PenLine size={16} />
                        </button>
                      )}
                      <button title="Delete" className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600" onClick={() => onDelete(doc)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages}</span>
          <button className="btn-secondary" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => { setUploadOpen(false); navigate(`/documents/${doc.id}`); }}
      />
    </div>
  );
}
