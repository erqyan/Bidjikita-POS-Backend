import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg',
            'min-w-[320px] max-w-sm animate-slide-in',
            'border-l-4',
            toast.variant === 'destructive' && 'border-l-red-500',
            toast.variant === 'success' && 'border-l-green-500',
            (!toast.variant || toast.variant === 'default') && 'border-l-amber-500'
          )}
        >
          <div className="mt-0.5 shrink-0">
            {toast.variant === 'destructive' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : toast.variant === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Info className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-gray-500 mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
