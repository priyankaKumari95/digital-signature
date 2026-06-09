import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  FileSignature,
  Search,
  Download,
  ArrowLeft,
} from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { verifyApi } from '../api';
import { formatDate } from '../lib/format';

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2 sm:flex-row sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-800 ${mono ? 'break-all font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function Verify() {
  const { verificationId: paramId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(paramId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runVerify = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await verifyApi.verify(id);
      setResult(data);
    } catch (err) {
      setResult({ valid: false, message: err.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paramId) runVerify(paramId);
  }, [paramId, runVerify]);

  const onSubmit = (e) => {
    e.preventDefault();
    const id = input.trim();
    if (id) navigate(`/verify/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Back home
        </Link>

        <div className="card p-6 sm:p-8">
          <div className="flex items-center gap-2 text-brand-600">
            <FileSignature size={24} />
            <span className="font-bold text-slate-900">DigiSign — Document Verification</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Enter a verification ID (found on the signed document or its QR code) to confirm its
            authenticity.
          </p>

          <form onSubmit={onSubmit} className="mt-5 flex gap-2">
            <input
              className="input"
              placeholder="e.g. 3f9a1c2b8d7e6f5a4b3c2d1e0f9a8b7c"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={loading}>
              {loading ? <Spinner size={16} /> : <Search size={16} />} Verify
            </button>
          </form>

          {loading && (
            <div className="mt-6 flex items-center gap-2 text-slate-500">
              <Spinner size={18} /> Verifying…
            </div>
          )}

          {result && !loading && (
            <div className="mt-6">
              {result.valid ? (
                <>
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                    <ShieldCheck className="text-green-600" size={28} />
                    <div>
                      <p className="font-semibold text-green-800">Authentic document</p>
                      <p className="text-sm text-green-700">
                        This document was signed through DigiSign.
                      </p>
                    </div>
                  </div>

                  {result.integrity === 'mismatch' && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <ShieldAlert size={18} /> Warning: the stored file's fingerprint does not match
                      its record. It may have been altered.
                    </div>
                  )}

                  <div className="mt-4">
                    <Row label="Document" value={result.document.title} />
                    <Row label="Signed by" value={result.document.signerName} />
                    <Row label="Account holder" value={result.document.accountHolder || '—'} />
                    <Row label="Signed at" value={formatDate(result.document.signedAt)} />
                    <Row label="Pages" value={result.document.pageCount} />
                    <Row label="Verification ID" value={result.document.verificationId} mono />
                    <Row label="SHA-256 fingerprint" value={result.document.sha256} mono />
                  </div>

                  <a
                    href={verifyApi.downloadUrl(result.document.verificationId)}
                    className="btn-secondary mt-5 w-full"
                  >
                    <Download size={16} /> Download signed document
                  </a>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <ShieldX className="text-red-600" size={28} />
                  <div>
                    <p className="font-semibold text-red-800">Not verified</p>
                    <p className="text-sm text-red-700">
                      {result.message || 'No signed document matches this verification ID.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
