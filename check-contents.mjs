import { createClient } from '@supabase/supabase-js';

const url = 'https://tliabhiwngjhmekgkeez.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaWFiaGl3bmdqaG1la2drZWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg1ODgxMiwiZXhwIjoyMTA1NDM0ODEyfQ.QOxJCGeYcxD8uIC-kOcpeKiQ5jtQ9J4TQcn2ZyzCH2Y';
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('learning_contents').select('*').eq('is_active', true);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Active contents:', data.map(d => d.title));
  }
}

run();
