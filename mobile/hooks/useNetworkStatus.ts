import { useState, useEffect } from 'react';

/**
 * Simple network status hook.
 * In a production app you'd use @react-native-community/netinfo,
 * but this provides a lightweight fallback using fetch.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        const response = await fetch('https://httpbin.org/get', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        if (mounted) setIsOnline(response.ok);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
