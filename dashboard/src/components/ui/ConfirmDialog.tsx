import { AlertTriangle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Highlighted warning shown between description and footer. Also disables the confirm button. */
  warning?: string;
  onConfirm: () => void;
  loading?: boolean;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  warning,
  onConfirm,
  loading,
  confirmLabel = 'Konfirmasi',
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="mt-2 ml-11">{description}</DialogDescription>
        </DialogHeader>

        {warning && (
          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>{warning}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {warning ? 'Tutup' : 'Batal'}
          </Button>
          {!warning && (
            <Button
              variant={variant === 'danger' ? 'destructive' : 'default'}
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
