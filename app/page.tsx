'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Link, Loader2, Download, Copy, ExternalLink, History } from 'lucide-react';

type Job = {
  id: string;
  source_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url: string | null;
  created_at: string;
};

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        fetchData(session.user.id);
      }
    });

    const handleFocus = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text.match(/youtube\.com|youtu\.be|tiktok\.com|instagram\.com\/reels/)) {
          setUrl(text);
        }
      } catch (e) {}
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchData = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
    if (profile) setCredits(profile.credits);
    
    const { data: jobList } = await supabase.from('jobs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
    if (jobList) setJobs(jobList as Job[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits <= 0) return alert('Out of credits!');
    setSubmitting(true);

    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
        if (res.ok) {
            setUrl('');
            fetchData(session.user.id);
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to submit.');
        }
    } catch (e) {
        alert('Network error.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="animate-pulse flex flex-col items-center"><div className="w-12 h-12 bg-white/50 rounded-full mb-4"></div><div className="h-4 w-32 bg-white/50 rounded"></div></div>;

  return (
    <div className="w-full max-w-2xl space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center glass-panel px-6 py-4 rounded-2xl">
        <h1 className="font-bold text-xl tracking-tight text-slate-800">ClipDrop<span className="text-indigo-600">.pro</span></h1>
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-slate-600">{credits} Credits</div>
          {credits < 2 && (
            <a href="https://buy.stripe.com/test_credit_pack" target="_blank" className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
              + Top Up
            </a>
          )}
        </div>
      </div>

      {/* Main Machine */}
      <div className="glass-panel p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Drop a link. Get viral clips.</h2>
            <p className="text-slate-500">Supports YouTube, TikTok & Reels</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Link className="text-slate-400" size={20} />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste URL here..."
                required
                className="w-full pl-12 pr-4 py-5 text-lg rounded-2xl glass-input"
              />
          </div>
          <button
            disabled={submitting || credits <= 0}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2
              ${credits > 0 ? 'bg-slate-900 text-white hover:bg-black' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {submitting ? <Loader2 className="animate-spin" /> : 'Make Viral Clips ⚡'}
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-400 mt-4">
          ~90s processing time. Credits automatically refunded on failure.
        </p>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-500 ml-2">
            <History size={16} />
            <span className="text-sm font-medium">Recent Drops</span>
        </div>
        
        {jobs.map((job) => (
          <div key={job.id} className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white/90">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 font-mono truncate mb-1">{job.source_url}</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  job.status === 'completed' ? 'bg-green-500' :
                  job.status === 'failed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
                }`}></span>
                <span className="text-sm font-semibold capitalize text-slate-700">{job.status}</span>
              </div>
            </div>
            
            {job.status === 'completed' && job.result_url && (
              <div className="flex gap-2 shrink-0">
                <a 
                    href="https://drive.google.com/drive/my-drive" 
                    target="_blank"
                    className="p-2.5 text-green-700 bg-green-100/50 hover:bg-green-100 rounded-lg border border-green-200/50 transition-colors" 
                    title="Save to Drive"
                >
                  <ExternalLink size={18} />
                </a>
                <a 
                    href={job.result_url} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                >
                  <Download size={18} /> Download ZIP
                </a>
              </div>
            )}
            
            {job.status === 'failed' && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                Refunded
              </span>
            )}
          </div>
        ))}
        
        {jobs.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400">
                No drops yet. Paste a link above to start!
            </div>
        )}
      </div>
    </div>
  );
}