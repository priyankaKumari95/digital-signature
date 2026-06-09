import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import Spinner from '../components/ui/Spinner';
import { authApi } from '../api';
import { useToast } from '../context/ToastContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('Password reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const detail = err.details?.[0]?.message;
      toast.error(detail || err.message || 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Invalid reset link" subtitle="This password reset link is missing or invalid.">
        <Link to="/forgot-password" className="btn-primary w-full">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" type="password" required className="input" value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" required className="input" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner size={16} /> : 'Reset password'}
        </button>
      </form>
    </AuthCard>
  );
}
