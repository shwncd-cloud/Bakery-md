import { useEffect, useState } from 'react';
import { flushOutbox } from '../api/client';
import { queueLength } from './outbox';

const RETRY_INTERVAL_MS = 15000;

/// Drives the offline banner and keeps retrying the queued orders/payments
/// whenever the connection comes back, without the user having to do
/// anything.
export function useOutboxStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(queueLength());

  useEffect(() => {
    const tryFlush = async () => {
      if (!navigator.onLine) return;
      await flushOutbox();
      setPending(queueLength());
    };

    const handleOnline = () => {
      setIsOnline(true);
      void tryFlush();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const interval = setInterval(() => void tryFlush(), RETRY_INTERVAL_MS);
    void tryFlush();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pending, refreshPending: () => setPending(queueLength()) };
}
