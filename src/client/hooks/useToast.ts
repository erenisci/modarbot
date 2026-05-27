import { useCallback, useState } from 'react';

export type ToastKind = 'success' | 'info' | 'error';
export type ToastState = {
  id: number;
  message: string;
  kind: ToastKind;
} | null;

const DURATION_MS = 3_500;

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>(null);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now();
    setToast({ id, message, kind });
    window.setTimeout(() => {
      setToast((current) => (current && current.id === id ? null : current));
    }, DURATION_MS);
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, show, dismiss };
};
