import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { url } = await req.json();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Transaction: Check & Deduct Credits
  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', session.user.id).single();
  
  if (!profile || profile.credits < 1) {
    return NextResponse.json({ error: 'Insufficient credits. Please top up.' }, { status: 402 });
  }

  // Deduct
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - 1 })
    .eq('id', session.user.id);

  if (updateError) return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });

  // 2. Create Job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      user_id: session.user.id,
      source_url: url,
      status: 'pending'
    })
    .select()
    .single();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  // 3. Trigger Worker (In production, this might be a fetch to the python worker endpoint)
  // await fetch(process.env.WORKER_URL, { method: 'POST', body: JSON.stringify({ jobId: job.id }) });

  return NextResponse.json({ success: true, jobId: job.id });
}