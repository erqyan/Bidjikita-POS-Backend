import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, AlertTriangle, Search } from "lucide-react";
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
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
  material_name: z.string().min(1, "Nama bahan wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  cost_per_unit: z.coerce.number().min(0, "Harga/satuan tidak boleh negatif"),
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

  const { data: ingredients = [], isPending } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => getIngredients().then((r) => r.data),
  });

  const filtered = useMemo(
    () =>
      ingredients.filter((m) =>
        m.material_name.toLowerCase().includes(dSearch.toLowerCase()),
      ),
    [ingredients, dSearch],
  );

  const lowCount = ingredients.filter(
    (m) => Number(m.stock) <= Number(m.minimum_stock),
  ).length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
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
      qc.invalidateQueries({ queryKey: ["ingredients"] });
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
      qc.invalidateQueries({ queryKey: ["ingredients"] });
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
              <TableHead>Nama Bahan</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Harga / Satuan</TableHead>
              <TableHead>Stok Saat Ini</TableHead>
              <TableHead>Stok Minimum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Diperbarui</TableHead>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Bahan Baku"
        description={`Yakin ingin menghapus "${deleteTarget?.material_name}"? Bahan yang digunakan dalam resep tidak dapat dihapus.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}
