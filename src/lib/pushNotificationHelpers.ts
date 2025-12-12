// Helper to get VAPID public key from environment or prompt user to configure
export const getVapidPublicKey = (): string | null => {
  // In production, this would come from your environment configuration
  // For now, we'll need users to configure it in their Supabase edge function secrets
  // The key should be stored in a configuration or fetched from Supabase
  
  // This is a placeholder - users will need to replace this with their actual VAPID public key
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  
  if (!vapidKey) {
    console.warn('VAPID public key not configured. Push notifications will not work.');
    return null;
  }
  
  return vapidKey;
};

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
