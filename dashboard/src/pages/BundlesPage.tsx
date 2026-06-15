import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Package, Upload, ImageIcon } from 'lucide-react';
import { getAllBundles, createBundle, updateBundle, deleteBundle } from '@/api/bundles';
import { getProducts } from '@/api/products';
import type { Bundle, BundleItem, Product, ProductVariant } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useToast } from '@/store/toastStore';
import { formatCurrency, getMediaUrl } from '@/lib/utils';
import apiClient from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Production cost of a variant: sum(ingredient_qty × cost_per_unit) + overhead. */
function getVariantCost(v: Pick<ProductVariant, 'overhead_cost' | 'VariantIngredients'> | undefined): number {
  if (!v) return 0;
  const ingCost = (v.VariantIngredients || []).reduce(
    (sum, vi) => sum + Number(vi.quantity) * Number(vi.RawMaterial?.cost_per_unit || 0), 0,
  );
  return ingCost + Number(v.overhead_cost || 0);
}

/** Selling price of a variant. */
function getVariantPrice(v: Pick<ProductVariant, 'price'> | undefined): number {
  return v ? Number(v.price || 0) : 0;
}

/** Resolve the selected variant for a bundle item. Falls back to first variant. */
function resolveVariant(product: Product, variantId: number | undefined): ProductVariant | undefined {
  if (variantId) {
    const found = product.ProductVariants?.find((v) => v.id === variantId);
    if (found) return found;
  }
  return product.ProductVariants?.[0];
}

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  bundle_name: z.string().trim().min(1, 'Nama bundle wajib diisi'),
  description: z.string().optional(),
  bundle_price: z.coerce.number().min(1, 'Harga bundle wajib diisi'),
  items: z.array(z.object({
    product_id: z.coerce.number().min(1, 'Pilih produk'),
    variant_id: z.coerce.number().optional(),
    quantity: z.coerce.number().min(1, 'Minimal 1'),
  })).min(1, 'Tambahkan minimal satu produk').refine((items) => {
    const seen = new Set();
    for (const item of items) {
      const key = `${item.product_id}-${item.variant_id || 'default'}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }, 'Terdapat produk/varian yang duplikat dalam bundle. Hapus duplikat sebelum menyimpan.'),
});
type FormData = z.infer<typeof schema>;

// ── LiveCalculation: watches items + bundle_price and shows cost/profit/comparison ──

function LiveCalculation({
  control,
  products,
}: {
  control: ReturnType<typeof useForm<FormData>>['control'];
  products: Product[];
}) {
  const watchedItems = useWatch({ control, name: 'items' }) ?? [];
  const watchedPrice = useWatch({ control, name: 'bundle_price' }) ?? 0;

  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalCost = 0;
  let totalIndividualPrice = 0;

  for (const item of watchedItems) {
    const pid = Number(item.product_id);
    const qty = Number(item.quantity) || 0;
    const product = productMap.get(pid);
    if (!product || pid === 0) continue;
    const variant = resolveVariant(product, item.variant_id);
    totalCost += getVariantCost(variant) * qty;
    totalIndividualPrice += getVariantPrice(variant) * qty;
  }

  const bundlePrice = Number(watchedPrice) || 0;
  const profit = bundlePrice - totalCost;
  const profitPct = bundlePrice > 0 ? (profit / bundlePrice) * 100 : 0;
  const savings = totalIndividualPrice - bundlePrice;
  const savingsPct = totalIndividualPrice > 0 ? (savings / totalIndividualPrice) * 100 : 0;

  const hasData = totalCost > 0 || totalIndividualPrice > 0;

  if (!hasData) return null;

  return (
    <div className="space-y-3">
      {/* Cost & Profit */}
      <div className="rounded-lg bg-white border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">KALKULASI BUNDLE</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-400">Total Biaya Produksi:</span>
          <span className="text-right font-medium">{formatCurrency(totalCost)}</span>
          <span className="text-gray-400">Harga Bundle:</span>
          <span className="text-right font-medium text-amber-700">{formatCurrency(bundlePrice)}</span>
          <span className="text-gray-400 font-semibold">Keuntungan:</span>
          <span className={`text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)} ({profitPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Price Comparison */}
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-800 mb-2">PERBANDINGAN HARGA</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-600">Beli satu-satu:</span>
          <span className="text-right font-medium text-gray-800">{formatCurrency(totalIndividualPrice)}</span>
          <span className="text-gray-600">Harga bundle:</span>
          <span className="text-right font-bold text-amber-700">{formatCurrency(bundlePrice)}</span>
        </div>
        {savings > 0 ? (
          <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700">Pelanggan hemat:</span>
            <span className="text-sm font-bold text-green-700">
              {formatCurrency(savings)} ({savingsPct.toFixed(0)}%)
            </span>
          </div>
        ) : savings < 0 ? (
          <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600">Bundle lebih mahal:</span>
            <span className="text-sm font-bold text-red-600">{formatCurrency(Math.abs(savings))}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── BundleImageCollage: 2×2 grid of product images from bundle items ─────────

function BundleImageCollage({ items }: { items: BundleItem[] }) {
  // Deduplicate so the same product image doesn't repeat
  const images = Array.from(
    new Set(items.map((item) => item.Product?.image_url).filter(Boolean))
  ).slice(0, 4) as string[];

  if (images.length === 0) {
    return (
      <div className="h-44 bg-linear-to-br from-amber-100 to-amber-200 flex items-center justify-center rounded-t-xl">
        <Package className="h-8 w-8 text-amber-400" />
      </div>
    );
  }

  // Single image — fill the whole area instead of being stuck in a 2-col grid
  if (images.length === 1) {
    return (
      <div className="h-44 rounded-t-xl overflow-hidden">
        <img
          src={getMediaUrl(images[0])}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5 h-44 rounded-t-xl overflow-hidden">
      {images.map((url, i) => (
        <img
          key={i}
          src={getMediaUrl(url)}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function BundlesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: bundles = [], isPending } = useQuery({ queryKey: ['all-bundles'], queryFn: () => getAllBundles().then((r) => r.data) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => getProducts().then((r) => r.data) });

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { items: [{ product_id: 0, quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const openCreate = () => {
    setEditing(null);
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    reset({ items: [{ product_id: 0, quantity: 1 }] });
    setOpen(true);
  };
  const openEdit = (b: Bundle) => {
    setEditing(b);
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(getMediaUrl(b.image_url) ?? "");
    if (imageInputRef.current) imageInputRef.current.value = "";
    reset({
      bundle_name: b.bundle_name,
      description: b.description,
      bundle_price: b.bundle_price,
      items: b.BundleItems?.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id ?? (i as any).ProductVariant?.id, quantity: i.quantity })) || [{ product_id: 0, quantity: 1 }],
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const fd = new window.FormData();
      fd.append('bundle_name', data.bundle_name);
      if (data.description) fd.append('description', data.description);
      fd.append('bundle_price', String(data.bundle_price));
      fd.append('items', JSON.stringify(data.items.map((i) => ({
        product_id: Number(i.product_id),
        variant_id: i.variant_id ? Number(i.variant_id) : undefined,
        quantity: Number(i.quantity),
      }))));

      if (imageFile) {
        fd.append('image', imageFile);
      } else if (!imagePreview && editing) {
        fd.append('image_url', '');
      }

      return editing ? updateBundle(editing.id, fd) : createBundle(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bundles'] });
      toast({ title: 'Berhasil', description: editing ? 'Bundle diperbarui' : 'Bundle ditambahkan', variant: 'success' });
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast({ title: 'Gagal', description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBundle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-bundles'] }); toast({ title: 'Berhasil', description: 'Bundle dihapus', variant: 'success' }); setDeleteTarget(null); },
    onError: () => { toast({ title: 'Gagal', description: 'Gagal menghapus bundle', variant: 'destructive' }); setDeleteTarget(null); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (bundleId: number) => apiClient.patch(`/bundles/${bundleId}/toggle-active`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bundles'] });
      toast({ title: 'Berhasil', description: 'Status bundle diubah', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Gagal', description: 'Gagal mengubah status bundle', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{bundles.length} bundle terdaftar</p>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Bundle</Button>
      </div>

      {isPending ? <PageLoader /> : bundles.length === 0 ? (
        <EmptyState icon={<Package className="h-8 w-8 text-gray-400" />} title="Belum ada bundle" description="Buat paket produk untuk menarik lebih banyak pelanggan" action={<Button onClick={openCreate} size="sm">Tambah Bundle</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {bundles.map((b) => {
            const totalCost = b.total_bundle_cost;
            const individualTotal = (b.BundleItems || []).reduce((sum, item) => {
              const variant = item.ProductVariant;
              return sum + getVariantPrice(variant) * item.quantity;
            }, 0);
            const savings = individualTotal - b.bundle_price;

            return (
              <Card key={b.id} className={!b.is_active ? 'opacity-60' : ''}>
                              {b.image_url ? (
                                <img src={getMediaUrl(b.image_url)} alt="" className="h-44 w-full object-cover rounded-t-xl" />
                              ) : (
                                <BundleImageCollage items={b.BundleItems || []} />
                              )}
                              <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{b.bundle_name}</p>
                      {b.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{b.description}</p>}
                    </div>
                    <Badge variant={b.is_active ? 'success' : 'default'} className="ml-2 shrink-0">
                      {b.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>

                  {b.BundleItems && b.BundleItems.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-400 mb-1.5">PRODUK DALAM BUNDLE:</p>
                      <ul className="space-y-1">
                        {b.BundleItems.map((item) => {
                          const variantName = item.ProductVariant?.variant_name;
                          return (
                            <li key={item.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                              {item.Product?.product_name || `Produk #${item.product_id}`}
                              {variantName && <span className="text-gray-400">— {variantName}</span>}
                              <span className="text-gray-400">×{item.quantity}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Harga Bundle</span>
                      <span className="text-lg font-bold text-amber-600">{formatCurrency(b.bundle_price)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Biaya Produksi</span>
                      <span>{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Keuntungan</span>
                      <span className={Number(b.bundle_profit) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatCurrency(b.bundle_profit)}
                        {Number(b.bundle_price) > 0 && (
                          <span> ({(Number(b.bundle_profit) / Number(b.bundle_price) * 100).toFixed(1)}%)</span>
                        )}
                      </span>
                    </div>
                    {savings > 0 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-dashed border-gray-200">
                        <span className="text-green-600">Pelanggan hemat</span>
                        <span className="text-green-600 font-semibold">{formatCurrency(savings)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActiveMutation.mutate(b.id)} title={b.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                      {b.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => setDeleteTarget(b)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={(v: boolean) => { if (!v && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); setOpen(v); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Bundle' : 'Tambah Bundle'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <Input label="Nama Bundle" {...register('bundle_name')} error={errors.bundle_name?.message} placeholder="Contoh: Paket Hemat Pagi" />
            <Input label="Deskripsi (Opsional)" {...register('description')} placeholder="Deskripsi singkat bundle..." />

                                    {/* Image upload */}
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-1.5">
                                        Gambar Bundle (opsional)
                                      </p>
                                      <div className="flex items-start gap-3">
                                        {imagePreview ? (
                                          <div className="relative shrink-0">
                                            <img
                                              src={imagePreview}
                                              alt="Preview"
                                              className="h-20 w-20 rounded-xl object-cover border border-gray-200 shadow-sm"
                                            />
                                            <button
                                              type="button"
                                              onClick={clearImage}
                                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="h-20 w-20 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center shrink-0">
                                            <ImageIcon className="h-7 w-7 text-gray-300" />
                                          </div>
                                        )}
                                        <label className="flex-1 cursor-pointer">
                                          <div className="border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 text-center hover:border-amber-400 hover:bg-amber-50 transition-colors">
                                            <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                                            <p className="text-xs font-medium text-gray-600">
                                              {imagePreview ? "Ganti gambar" : "Pilih gambar"}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                              JPEG, PNG, WebP, GIF · Maks 5 MB
                                            </p>
                                          </div>
                                          <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            className="hidden"
                                            onChange={handleImageChange}
                                          />
                                        </label>
                                      </div>
                                    </div>

                                    {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Produk dalam Bundle</p>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: 0, quantity: 1 })}>
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </div>
              {errors.items && typeof errors.items.message === 'string' && (
                <p className="text-xs text-red-600 mb-2">{errors.items.message}</p>
              )}
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Controller name={`items.${idx}.product_id`} control={control} render={({ field: f }) => (
                        <Select
                          options={products.filter((p) => p.status === 'available').map((p) => ({ value: String(p.id), label: p.product_name }))}
                          value={f.value ? String(f.value) : undefined}
                          onValueChange={(v) => {
                            const productId = Number(v);
                            f.onChange(productId);
                            // Auto-set variant_id if product has exactly 1 variant
                            const product = products.find((p) => p.id === productId);
                            const vars = product?.ProductVariants ?? [];
                            if (vars.length === 1) {
                              setValue(`items.${idx}.variant_id`, vars[0].id);
                            } else {
                              setValue(`items.${idx}.variant_id`, undefined);
                            }
                          }}
                          placeholder="Pilih produk..."
                          error={errors.items?.[idx]?.product_id?.message}
                        />
                      )} />
                    </div>
                    {/* Variant selector — only when product has multiple variants */}
                    {(() => {
                      const selectedProduct = products.find((p) => p.id === Number(watchedItems?.[idx]?.product_id));
                      const variants = selectedProduct?.ProductVariants ?? [];
                      if (variants.length <= 1) return null;
                      return (
                        <div className="w-40">
                          <Controller name={`items.${idx}.variant_id`} control={control} render={({ field: f }) => (
                            <Select
                              options={variants.map((v) => ({ value: String(v.id), label: v.variant_name }))}
                              value={f.value ? String(f.value) : undefined}
                              onValueChange={(v) => f.onChange(Number(v))}
                              placeholder="Varian..."
                            />
                          )} />
                        </div>
                      );
                    })()}
                    <div className="w-24">
                      <Input type="number" min="1" placeholder="Qty" {...register(`items.${idx}.quantity`)} error={errors.items?.[idx]?.quantity?.message} />
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" className="mt-1 text-red-400 hover:bg-red-50" onClick={() => remove(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bundle Price — below products */}
            <Input label="Harga Bundle (Rp)" type="number" step="any" {...register('bundle_price')} error={errors.bundle_price?.message} placeholder="50000" />

            {/* Live calculations */}
            <LiveCalculation control={control} products={products} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Simpan' : 'Tambah Bundle'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v: boolean) => !v && setDeleteTarget(null)} title="Hapus Bundle" description={`Hapus bundle "${deleteTarget?.bundle_name}"?`} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} loading={deleteMutation.isPending} confirmLabel="Hapus" />
    </div>
  );
}
