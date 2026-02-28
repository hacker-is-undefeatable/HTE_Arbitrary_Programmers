import { createClient } from '@supabase/supabase-js';

// Singleton instance for browser client
let browserClient: ReturnType<typeof createClient> | null = null;

// For client-side operations - returns singleton instance
export const createBrowserClient = () => {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
};

// For server-side operations
export const createServerClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      availableEnvVars: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
  }
  
  return createClient(
    url || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Export singleton instance
export const supabase = createBrowserClient();
