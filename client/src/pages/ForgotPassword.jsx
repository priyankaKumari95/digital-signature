import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import Spinner from '../components/ui/Spinner';
import { authApi } from '../api';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSent(true);
      // non-prod returns the reset URL so we can test the flow
      if (res?.data?.resetUrl) setDevLink(res.data.resetUrl);
    } catch (err) {
      toast.error(err.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We'll email you a link to reset your password."
      footer={
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            If an account exists for <strong>{email}</strong>, a password reset link has been sent.
          </p>
          {devLink && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-medium">Dev mode — reset link:</p>
              <Link to={devLink.replace(window.location.origin, '')} className="break-all underline">
                {devLink}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? <Spinner size={16} /> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
