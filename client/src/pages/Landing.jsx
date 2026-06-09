import { Link } from 'react-router-dom';
import {
  FileSignature,
  ShieldCheck,
  UploadCloud,
  PenTool,
  History,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: UploadCloud, title: 'Upload PDFs', desc: 'Securely upload documents and preview them right in the browser.' },
  { icon: PenTool, title: 'Sign electronically', desc: 'Draw or type a signature and place it precisely on any page.' },
  { icon: ShieldCheck, title: 'Tamper-evident', desc: 'Every signed PDF is fingerprinted with SHA-256 for integrity.' },
  { icon: QrCode, title: 'Public verification', desc: 'Anyone can verify authenticity via a QR code or verification ID.' },
  { icon: History, title: 'Full audit trail', desc: 'Every action is logged for accountability and compliance.' },
  { icon: FileSignature, title: 'Reusable signatures', desc: 'Save signatures once and reuse them across documents.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <FileSignature className="text-brand-600" size={24} /> DigiSign
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/verify" className="btn-secondary">Verify a document</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Sign in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <span className="badge bg-brand-50 text-brand-700">Digital Signature & Document Management</span>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Sign, manage and verify documents with confidence
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          A production-ready platform to upload PDFs, sign them electronically, and let anyone verify
          their authenticity — backed by cryptographic hashing and a complete audit trail.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn-primary px-6 py-3 text-base">
            {isAuthenticated ? 'Go to dashboard' : 'Start for free'} <ArrowRight size={18} />
          </Link>
          <Link to="/verify" className="btn-secondary px-6 py-3 text-base">Verify a document</Link>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Everything you need to sign with trust</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 text-left">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} DigiSign. Built for the Full Stack Developer Assessment.
      </footer>
    </div>
  );
}
