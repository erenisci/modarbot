import type { ToastState } from '../hooks/useToast';

const KIND_STYLES = {
  success: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  info: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  error: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
};

export const Toast = ({ toast }: { toast: ToastState }) => {
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg border text-sm shadow-lg ${KIND_STYLES[toast.kind]}`}
    >
      {toast.message}
    </div>
  );
};
