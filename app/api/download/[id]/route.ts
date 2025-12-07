import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify ownership
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.redirect(new URL('/login', req.url));

  const { data: job } = await supabase
    .from('jobs')
    .select('result_url, user_id')
    .eq('id', params.id)
    .single();

  if (!job || job.user_id !== session.user.id || !job.result_url) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.redirect(job.result_url);
}