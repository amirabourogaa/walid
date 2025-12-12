import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a signed URL for a file in the client-files bucket
 * @param path - The full path to the file in storage
 * @param expiresIn - Number of seconds until the URL expires (default: 1 hour)
 * @returns The signed URL or null if generation fails
 */
export async function getSignedUrl(path: string | null | undefined, expiresIn: number = 3600): Promise<string | null> {
  if (!path) return null;
  
  try {
    // Extract just the file path from the full URL if it's a full URL
    let filePath = path;
    if (path.includes('client-files/')) {
      filePath = path.split('client-files/')[1];
    }
    
    const { data, error } = await supabase.storage
      .from('client-files')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      // Silently return null for missing files (404) - they'll use fallback UI
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    // Silently return null for missing files - they'll use fallback UI
    return null;
  }
}

/**
 * Generates signed URLs for multiple files
 * @param paths - Array of file paths
 * @param expiresIn - Number of seconds until the URLs expire (default: 1 hour)
 * @returns Array of signed URLs (null for failed generations)
 */
export async function getSignedUrls(paths: (string | null | undefined)[], expiresIn: number = 3600): Promise<(string | null)[]> {
  return Promise.all(paths.map(path => getSignedUrl(path, expiresIn)));
}

/**
 * Hook to manage signed URLs with automatic refresh
 */
export function useSignedUrl(path: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    let isMounted = true;
    
    async function fetchSignedUrl() {
      const url = await getSignedUrl(path, 3600); // 1 hour expiry
      if (isMounted) {
        setSignedUrl(url);
      }
    }
    
    if (path) {
      fetchSignedUrl();
      // Refresh the signed URL every 50 minutes (before 1 hour expiry)
      const interval = setInterval(fetchSignedUrl, 50 * 60 * 1000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    } else {
      setSignedUrl(null);
    }
  }, [path]);
  
  return signedUrl;
}

// Import React for the hook
import React from 'react';
