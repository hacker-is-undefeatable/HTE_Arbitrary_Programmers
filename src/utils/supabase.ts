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
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Export singleton instance
export const supabase = createBrowserClient();
