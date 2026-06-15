import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, AlertTriangle, Search, ChevronUp, ChevronDown, ChevronsUpDown, History } from "lucide-react";
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getIngredientLogs,
  type IngredientLogEntry,
} from "@/api/ingredients";
import type { RawMaterial } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  TableWrapper,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { useToast } from "@/store/toastStore";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

const schema = z.object({
  material_name: z.string().min(1, "Nama bahan wajib diisi").max(255, "Nama bahan maksimal 255 karakter"),
  unit: z.string().min(1, "Satuan wajib diisi").max(255, "Satuan maksimal 255 karakter"),
  cost_per_unit: z.coerce.number().min(1, "Harga per satuan wajib diisi"),
  stock: z.coerce.number().min(0, "Stok tidak boleh negatif"),
  minimum_stock: z.coerce.number().min(0, "Stok minimum tidak boleh negatif"),
});
type FormData = z.infer<typeof schema>;

function getStockStatus(m: RawMaterial): {
  label: string;
  variant: "success" | "warning" | "danger";
} {
  if (m.stock <= 0) return { label: "Habis", variant: "danger" };
  if (m.stock <= m.minimum_stock)
    return { label: "Hampir Habis", variant: "warning" };
  return { label: "Aman", variant: "success" };
}

export default function IngredientsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const dSearch = useDebounce(search);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null);
  const [logTarget, setLogTarget] = useState<RawMaterial | null>(null);

  const { data: logs = [], isFetching: loadingLogs } = useQuery({
    queryKey: ["ingredient-logs", logTarget?.id],
    queryFn: () => getIngredientLogs(logTarget!.id).then((r) => r.data),
    enabled: !!logTarget,
    refetchOnMount: "always",
  });
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const { data: ingredients = [], isPending } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => getIngredients().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    let result = ingredients.filter((m) =>
      m.material_name.toLowerCase().includes(dSearch.toLowerCase()),
    );

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortKey) {
          case 'name':
            aVal = a.material_name.toLowerCase();
            bVal = b.material_name.toLowerCase();
            break;
          case 'unit':
            aVal = a.unit.toLowerCase();
            bVal = b.unit.toLowerCase();
            break;
          case 'cost':
            aVal = Number(a.cost_per_unit);
            bVal = Number(b.cost_per_unit);
            break;
          case 'stock':
            aVal = Number(a.stock);
            bVal = Number(b.stock);
            break;
          case 'min_stock':
            aVal = Number(a.minimum_stock);
            bVal = Number(b.minimum_stock);
            break;
          case 'updated':
            aVal = new Date(a.updatedAt || 0).getTime();
            bVal = new Date(b.updatedAt || 0).getTime();
            break;
        }

        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [ingredients, dSearch, sortKey, sortDir]);

  const lowCount = ingredients.filter(
    (m) => Number(m.stock) <= Number(m.minimum_stock),
  ).length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { cost_per_unit: 0, stock: 0, minimum_stock: 0 },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ cost_per_unit: 0, stock: 0, minimum_stock: 0 });
    setOpen(true);
  };

  const openEdit = (m: RawMaterial) => {
    setEditing(m);
    reset({
      material_name: m.material_name,
      unit: m.unit,
      cost_per_unit: Number(m.cost_per_unit),
      stock: Number(m.stock),
      minimum_stock: Number(m.minimum_stock),
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) =>
      editing ? updateIngredient(editing.id, data) : createIngredient(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["analytics-summary"], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["ingredient-logs"], refetchType: "all" });
      toast({
        title: "Berhasil",
        description: editing ? "Bahan diperbarui" : "Bahan ditambahkan",
        variant: "success",
      });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteIngredient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["analytics-summary"], refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["ingredient-logs"], refetchType: "all" });
      toast({
        title: "Berhasil",
        description: "Bahan dihapus",
        variant: "success",
      });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menghapus bahan";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-5">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {lowCount} bahan baku membutuhkan pengisian stok segera
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bahan baku..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Bahan
        </Button>
      </div>

      {isPending ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada bahan baku"
          description="Tambahkan bahan baku beserta harga per satuannya agar biaya menu dapat dihitung otomatis."
          action={
            <Button onClick={openCreate} size="sm">
              Tambah Bahan
            </Button>
          }
        />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead className="cursor-pointer select-none">
                <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1 w-full cursor-pointer">
                  Nama Bahan
                  {sortKey === 'name' ? (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  )}
                </button>
              </TableHead>
              <TableHead className="cursor-pointer select-none">
                <button type="button" onClick={() => handleSort('unit')} className="flex items-center gap-1 w-full cursor-pointer">
                  Satuan
                  {sortKey === 'unit' ? (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  )}
                </button>
              </TableHead>
              <TableHead className="cursor-pointer select-none">
                <button type="button" onClick={() => handleSort('cost')} className="flex items-center gap-1 w-full cursor-pointer">
                  Harga / Satuan
                  {sortKey === 'cost' ? (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  )}
                </button>
              </TableHead>
              <TableHead className="cursor-pointer select-none">
                <button type="button" onClick={() => handleSort('stock')} className="flex items-center gap-1 w-full cursor-pointer">
                  Stok Saat Ini
                  {sortKey === 'stock' ? (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  )}
                </button>
              </TableHead>
              <TableHead className="cursor-pointer select-none">
                <button type="button" onClick={() => handleSort('min_stock')} className="flex items-center gap-1 w-full cursor-pointer">
                  Stok Minimum
                  {sortKey === 'min_stock' ? (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  )}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer select-none">
                <button type="button" onClick={() => handleSort('updated')} className="flex items-center gap-1 w-full cursor-pointer">
                  Diperbarui
                  {sortKey === 'updated' ? (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => {
              const status = getStockStatus(m);
              const isLow = Number(m.stock) <= Number(m.minimum_stock);
              return (
                <TableRow
                  key={m.id}
                  className={isLow ? "bg-red-50 hover:bg-red-100" : ""}
                >
                  <TableCell className="font-medium">
                    {m.material_name}
                  </TableCell>
                  <TableCell className="text-gray-600">{m.unit}</TableCell>
                  <TableCell className="font-semibold text-amber-700">
                    {formatCurrency(m.cost_per_unit)}
                    <span className="text-gray-400 font-normal text-xs">
                      /{m.unit}
                    </span>
                  </TableCell>
                  <TableCell
                    className={isLow ? "text-red-700 font-semibold" : ""}
                  >
                    {Number(m.stock)} {m.unit}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {Number(m.minimum_stock)} {m.unit}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {formatDateTime(m.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setLogTarget(m)}
                        title="Riwayat stok"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableWrapper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Nama Bahan"
              {...register("material_name")}
              error={errors.material_name?.message}
              placeholder="Contoh: Biji Kopi Arabika"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Satuan"
                {...register("unit")}
                error={errors.unit?.message}
                placeholder="gram, ml, buah, liter…"
              />
              <Input
                label="Harga per Satuan (Rp)"
                type="number"
                step="0.0001"
                min="0"
                {...register("cost_per_unit")}
                error={errors.cost_per_unit?.message}
                helperText="Digunakan menghitung biaya resep"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Stok Saat Ini"
                type="number"
                step="0.01"
                {...register("stock")}
                error={errors.stock?.message}
              />
              <Input
                label="Stok Minimum"
                type="number"
                step="0.01"
                {...register("minimum_stock")}
                error={errors.minimum_stock?.message}
                helperText="Batas peringatan stok rendah"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? "Simpan Perubahan" : "Tambah Bahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={!!logTarget} onOpenChange={(v: boolean) => !v && setLogTarget(null)}>
        <DialogContent className="max-w-lg max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>Riwayat Stok: {logTarget?.material_name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh]">
            {loadingLogs ? (
              <PageLoader />
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Belum ada riwayat perubahan stok</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 text-sm">
                    <div
                      className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                        log.quantity_change > 0 ? 'bg-green-400' : log.quantity_change < 0 ? 'bg-red-400' : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold ${log.quantity_change > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {log.quantity_change > 0 ? '+' : ''}{Number(log.quantity_change)} {logTarget?.unit}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {Number(log.previous_stock)} → {Number(log.new_stock)} {logTarget?.unit}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        {log.change_type === 'order_deduction' ? (
                          <span className="inline-block bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-medium">PESANAN</span>
                        ) : (
                          <span className="inline-block bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-medium">ADJUSTMENT</span>
                        )}
                        {log.user_name && (
                          <span className="text-gray-400">oleh {log.user_name}</span>
                        )}
                      </div>
                      {log.notes && (
                        <p className="text-[11px] text-gray-400 mt-1 italic">{log.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v: boolean) => !v && setDeleteTarget(null)}
        title="Hapus Bahan Baku"
        description={`Yakin ingin menghapus "${deleteTarget?.material_name}"? Bahan yang digunakan dalam resep tidak dapat dihapus.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}
