import { useState, useEffect } from 'react';
import { getSignedUrl } from '@/lib/storageUtils';

interface SecureImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Component that automatically fetches and displays images from secure storage using signed URLs
 */
export function SecureImage({ src, alt, className, fallback }: SecureImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchSignedUrl() {
      if (!src) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(false);

      try {
        const url = await getSignedUrl(src, 3600); // 1 hour expiry
        if (isMounted) {
          if (url) {
            setSignedUrl(url);
          } else {
            setError(true);
          }
          setIsLoading(false);
        }
      } catch (err) {
        // Silently handle error - fallback UI will be shown
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    }

    fetchSignedUrl();
    
    // Refresh the signed URL every 50 minutes (before 1 hour expiry)
    const interval = setInterval(fetchSignedUrl, 50 * 60 * 1000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [src]);

  if (!src || error) {
    return fallback ? <>{fallback}</> : null;
  }

  if (isLoading || !signedUrl) {
    return (
      <div className={className}>
        <div className="animate-pulse bg-muted rounded" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
