'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) alert(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-3xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
          ClipDrop.pro
        </h1>
        <p className="text-slate-500">Drop a link. Get viral clips.</p>
      </div>
      
      {sent ? (
        <div className="text-center p-6 bg-green-50/50 rounded-2xl border border-green-100">
          <div className="text-4xl mb-2">🪄</div>
          <h3 className="text-green-800 font-semibold mb-1">Check your inbox</h3>
          <p className="text-green-700 text-sm">We sent you a magic link to sign in.</p>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
             <label className="text-sm font-medium text-slate-600 ml-1">Email address</label>
             <input
                type="email"
                placeholder="you@creator.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl glass-input"
             />
          </div>
          <button
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Get My 2 Free Credits'}
          </button>
        </form>
      )}
    </div>
  );
}