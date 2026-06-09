import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form);
      toast.success('Account created. Welcome to DigiSign!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.details?.[0]?.message;
      toast.error(detail || err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start signing and managing documents in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" required className="input" value={form.name}
            onChange={onChange} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required
            className="input" value={form.email} onChange={onChange} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required
            className="input" value={form.password} onChange={onChange} placeholder="At least 8 characters" />
          <p className="mt-1 text-xs text-slate-400">Must include letters and numbers, min 8 characters.</p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner size={16} /> : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
