import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PenTool,
  CheckCircle2,
  Download,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import PdfCanvas from '../components/PdfCanvas';
import PlacementBox from '../components/PlacementBox';
import SignaturePad from '../components/SignaturePad';
import Modal from '../components/ui/Modal';
import Spinner, { FullPageSpinner } from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { documentApi, signatureApi } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, saveBlob } from '../lib/format';

let placementId = 0;

function imageAspect(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.4);
    img.onerror = () => resolve(0.4);
    img.src = dataUrl;
  });
}

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(1);
  const [page, setPage] = useState(1);

  const [placements, setPlacements] = useState([]);
  const [activeSig, setActiveSig] = useState(null);
  const [savedSigs, setSavedSigs] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signing, setSigning] = useState(false);

  const onDocumentLoaded = useCallback((n) => setNumPages(n), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await documentApi.get(id);
      setDoc(d);
      setSignerName(d.signerName || user?.name || '');
      const variant = d.status === 'signed' ? 'signed' : 'original';
      const blob = await documentApi.fileBlob(id, variant);
      const buf = await blob.arrayBuffer();
      setPdfData(new Uint8Array(buf));
    } catch (err) {
      toast.error(err.message || 'Failed to load document');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    signatureApi.list().then(setSavedSigs).catch(() => {});
  }, []);

  const chooseSignature = async ({ dataUrl, name, type }, persist) => {
    const aspect = await imageAspect(dataUrl);
    setActiveSig({ dataUrl, aspect });
    setPickerOpen(false);
    toast.info('Click on the document to place your signature.');
    if (persist) {
      try {
        const sig = await signatureApi.create({ name: name || 'My signature', type, dataUrl });
        setSavedSigs((s) => [sig, ...s]);
      } catch (err) {
        toast.error(err.message || 'Could not save signature');
      }
    }
  };

  const addPlacementAt = (e, dims) => {
    if (!activeSig || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const wRatio = 0.25;
    const wPx = wRatio * dims.width;
    const hPx = wPx * activeSig.aspect;
    const x = Math.min(Math.max(px - wPx / 2, 0), dims.width - wPx) / dims.width;
    const y = Math.min(Math.max(py - hPx / 2, 0), dims.height - hPx) / dims.height;
    setPlacements((arr) => [
      ...arr,
      { id: ++placementId, page, x, y, width: wRatio, height: hPx / dims.height, imageDataUrl: activeSig.dataUrl },
    ]);
  };

  const updatePlacement = (updated) =>
    setPlacements((arr) => arr.map((p) => (p.id === updated.id ? updated : p)));
  const removePlacement = (pid) => setPlacements((arr) => arr.filter((p) => p.id !== pid));

  const finishSigning = async () => {
    if (placements.length === 0) {
      toast.error('Add at least one signature before finishing.');
      return;
    }
    setSigning(true);
    try {
      const payload = {
        signerName: signerName || undefined,
        placements: placements.map(({ page: pg, x, y, width, height, imageDataUrl }) => ({
          page: pg, x, y, width, height, imageDataUrl,
        })),
      };
      await documentApi.sign(id, payload);
      toast.success('Document signed successfully!');
      await load();
      setPlacements([]);
      setActiveSig(null);
    } catch (err) {
      toast.error(err.message || 'Signing failed');
    } finally {
      setSigning(false);
    }
  };

  const downloadSigned = async () => {
    try {
      const blob = await documentApi.downloadBlob(id, 'signed');
      saveBlob(blob, `${doc.title}-signed.pdf`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  if (loading || !doc) return <FullPageSpinner label="Loading document…" />;

  const isSigned = doc.status === 'signed';
  const pagePlacements = placements.filter((p) => p.page === page);

  return (
    <div>
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to documents
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{doc.title}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-sm text-slate-500">{doc.originalFilename} · {doc.pageCount} page(s)</p>
        </div>
        {isSigned && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={downloadSigned}><Download size={16} /> Download</button>
            <a className="btn-secondary" href={`/verify/${doc.verificationId}`} target="_blank" rel="noreferrer">
              <ShieldCheck size={16} /> Verify
            </a>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col items-center">
          <div className="mb-3 flex items-center gap-3">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-600">Page {page} of {numPages}</span>
            <button className="btn-secondary" disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          {pdfData && (
            <PdfCanvas
              data={pdfData}
              pageNumber={page}
              targetWidth={680}
              onDocumentLoaded={onDocumentLoaded}
              renderOverlay={
                isSigned
                  ? undefined
                  : (dims) => (
                      <div
                        className="absolute inset-0"
                        style={{ cursor: activeSig ? 'crosshair' : 'default' }}
                        onClick={(e) => addPlacementAt(e, dims)}
                      >
                        {pagePlacements.map((p) => (
                          <PlacementBox
                            key={p.id}
                            placement={p}
                            dims={dims}
                            onChange={updatePlacement}
                            onRemove={() => removePlacement(p.id)}
                          />
                        ))}
                      </div>
                    )
              }
            />
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          {isSigned ? (
            <div className="card p-5">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={20} /> <span className="font-semibold">Signed</span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="text-slate-500">Signed by</dt><dd className="font-medium text-slate-800">{doc.signerName}</dd></div>
                <div><dt className="text-slate-500">Signed at</dt><dd className="font-medium text-slate-800">{formatDate(doc.signedAt)}</dd></div>
                <div><dt className="text-slate-500">Verification ID</dt><dd className="break-all font-mono text-xs text-slate-700">{doc.verificationId}</dd></div>
                <div><dt className="text-slate-500">SHA-256</dt><dd className="break-all font-mono text-xs text-slate-700">{doc.sha256}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="card space-y-4 p-5">
              <h3 className="font-semibold text-slate-900">Sign this document</h3>

              <button className="btn-primary w-full" onClick={() => setPickerOpen(true)}>
                <PenTool size={16} /> {activeSig ? 'Change signature' : 'Add signature'}
              </button>

              {activeSig && (
                <div className="rounded-lg border border-slate-200 p-2">
                  <p className="mb-1 text-xs text-slate-500">Active signature — click the page to place it:</p>
                  <img src={activeSig.dataUrl} alt="active signature" className="mx-auto h-12 object-contain" />
                </div>
              )}

              <div>
                <label className="label">Signer name</label>
                <input className="input" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {placements.length} signature(s) placed
                {placements.length > 0 && (
                  <span className="text-slate-400"> across {new Set(placements.map((p) => p.page)).size} page(s)</span>
                )}
              </div>

              <button className="btn-primary w-full" disabled={signing || placements.length === 0} onClick={finishSigning}>
                {signing ? <Spinner size={16} /> : <CheckCircle2 size={16} />}
                {signing ? 'Signing…' : 'Finish & sign'}
              </button>
              <p className="text-xs text-slate-400">
                A SHA-256 fingerprint and a public verification QR code will be embedded in the signed PDF.
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a signature">
        {savedSigs.length > 0 && (
          <div className="mb-4">
            <p className="label">Saved signatures</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {savedSigs.map((s) => (
                <button
                  key={s.id}
                  onClick={() => chooseSignature({ dataUrl: s.dataUrl }, false)}
                  className="flex h-16 items-center justify-center rounded-lg border border-slate-200 p-1 hover:border-brand-400"
                >
                  <img src={s.dataUrl} alt={s.name} className="max-h-full object-contain" />
                </button>
              ))}
            </div>
            <div className="my-4 flex items-center gap-2 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" /> or create new <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}
        <SignatureCreator onUse={chooseSignature} />
      </Modal>
    </div>
  );
}

function SignatureCreator({ onUse }) {
  const [persist, setPersist] = useState(true);
  return (
    <div>
      <SignaturePad
        showName
        saveLabel="Use this signature"
        onSave={(payload) => onUse(payload, persist)}
      />
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} />
        Save to my reusable signatures
        <Plus size={14} className="text-slate-400" />
      </label>
    </div>
  );
}
