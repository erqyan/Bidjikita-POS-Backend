/**
 * MenuPage – Unified menu management with variant support.
 *
 * Architecture:
 *   Product (Menu) → has many ProductVariants
 *   Each ProductVariant → owns its price, overhead_cost, and ingredients
 *
 * Features:
 *   - "Memiliki Varian?" toggle: OFF = single flat form, ON = accordion per variant
 *   - Each variant card has its own recipe builder and cost summary
 *   - Nested save payload: product + variants[] + ingredients[]
 */
import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useFormContext, useWatch, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Upload,
  ImageIcon,
} from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/api/categories";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/api/products";
import { getIngredients } from "@/api/ingredients";
import { getAllBundles } from "@/api/bundles";
import type { Category, Product, ProductVariant, VariantIngredient } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
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
import { formatCurrency, getMediaUrl } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

// ──────────────────────────────────────────────────────────────────────────────
// Types & Schema
// ──────────────────────────────────────────────────────────────────────────────

const ingredientSchema = z.object({
  ingredient_id: z.coerce.number().min(1, "Pilih bahan"),
  qty: z.coerce.number().min(0.1, "Jumlah harus > 0"),
});

const variantSchema = z.object({
  variant_name: z.string().optional().default(""),
  price: z.coerce.number().min(0, "Harga wajib diisi"),
  overhead_cost: z.coerce.number().min(0).default(0),
  ingredients: z
    .array(ingredientSchema)
    .min(1, "Tambahkan minimal satu bahan"),
});

const menuSchema = z.object({
  product_name: z.string().min(1, "Nama menu wajib diisi"),
  category_id: z.coerce.number().min(1, "Pilih kategori"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  status: z.enum(["available", "out_of_stock"]).default("available"),
  variants: z.array(variantSchema).min(1, "Minimal satu varian diperlukan"),
});

type MenuForm = z.infer<typeof menuSchema>;
type VariantForm = z.infer<typeof variantSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Toggle Switch Component (inline, no external dependency)
// ──────────────────────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
          checked ? "bg-amber-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Variant Accordion Card (sub-component for a single variant's form section)
// ──────────────────────────────────────────────────────────────────────────────

function VariantCard({
  variantIndex,
  onRemove,
  canRemove,
  isFlat,
  rawMaterials,
  ingredientMap,
}: {
  variantIndex: number;
  onRemove: () => void;
  canRemove: boolean;
  isFlat?: boolean;
  rawMaterials: ReturnType<typeof useIngredientsData>["rawMaterials"];
  ingredientMap: Record<string, { material_name: string; unit: string; cost_per_unit: number }>;
}) {
  const { register, control, setValue, formState: { errors } } = useFormContext<MenuForm>();
  const prefix = `variants.${variantIndex}` as const;

  const { fields, append, remove } = useFieldArray({
    name: `${prefix}.ingredients` as any,
  });

  const watchedIngredients = useWatch({ name: `${prefix}.ingredients` }) ?? [];
  const watchedPrice = useWatch({ name: `${prefix}.price` });
  const watchedOverhead = useWatch({ name: `${prefix}.overhead_cost` });

  // Live cost calculation
  const ingredientCost = watchedIngredients.reduce((sum: number, item: any) => {
    const mat = ingredientMap[String(item?.ingredient_id)];
    if (!mat) return sum;
    return sum + (Number(item?.qty) || 0) * Number(mat.cost_per_unit || 0);
  }, 0);

  const overheadVal = Number(watchedOverhead) || 0;
  const totalCost = ingredientCost + overheadVal;
  const sellingVal = Number(watchedPrice) || 0;
  const profit = sellingVal - totalCost;
  const profitPct = sellingVal > 0 ? (profit / sellingVal) * 100 : 0;

  const [isExpanded, setIsExpanded] = useState(true);

  // Profit target % — local state. Once set by the user, it stays fixed.
  const [targetMargin, setTargetMargin] = useState("");

  // When totalCost changes and targetMargin is set, auto-update the price
  // to maintain the target profit margin.
  useEffect(() => {
    const m = Number(targetMargin);
    if (m > 0 && m < 100 && totalCost > 0) {
      const autoPrice = Math.ceil(totalCost / (1 - m / 100));
      setValue(`${prefix}.price`, autoPrice, { shouldValidate: true });
    }
  }, [totalCost, targetMargin]);

  // ── Flat mode: no card wrapper, no variant name, no accordion ─────────────
  const bodyContent = (
    <div className={isFlat ? "space-y-4" : "border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50"}>
      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Bahan-bahan</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ingredient_id: 0, qty: 0 })}
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Bahan
          </Button>
        </div>
        {errors.variants?.[variantIndex]?.ingredients &&
          typeof errors.variants[variantIndex].ingredients?.message === "string" && (
            <p className="text-xs text-red-600 mb-2">
              {errors.variants[variantIndex].ingredients.message}
            </p>
          )}
        <div className="space-y-2">
          {fields.map((field, ingIdx) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Controller
                  name={`${prefix}.ingredients.${ingIdx}.ingredient_id`}
                  control={control}
                  render={({ field: f }) => (
                    <Select
                      options={rawMaterials.map((m) => ({
                        value: String(m.id),
                        label: `${m.material_name} (${m.unit})`,
                      }))}
                      value={f.value ? String(f.value) : undefined}
                      onValueChange={(v) => f.onChange(Number(v))}
                      placeholder="Pilih bahan..."
                      error={
                        (errors.variants?.[variantIndex]?.ingredients as any)?.[ingIdx]
                          ?.ingredient_id?.message
                      }
                    />
                  )}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Jumlah"
                  {...register(`${prefix}.ingredients.${ingIdx}.qty`)}
                  error={
                    (errors.variants?.[variantIndex]?.ingredients as any)?.[ingIdx]?.qty
                      ?.message
                  }
                />
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-1 text-red-400 hover:bg-red-50"
                  onClick={() => remove(ingIdx)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Target Profit Margin */}
      {totalCost > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">
            Target Keuntungan
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="99"
                step="any"
                placeholder="Mis. 60"
                value={targetMargin}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetMargin(val);
                  const m = Number(val);
                  if (m > 0 && m < 100 && totalCost > 0) {
                    const autoPrice = Math.ceil(totalCost / (1 - m / 100));
                    setValue(`${prefix}.price`, autoPrice, { shouldValidate: true });
                  }
                }}
                className="h-9 w-24 px-2 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-sm font-semibold text-amber-800">%</span>
              <span className="text-xs text-amber-600 ml-1">keuntungan</span>
            </div>
            {Number(targetMargin) > 0 && Number(targetMargin) < 100 && totalCost > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-400">→</span>
                <span className="font-bold text-amber-800">
                  Harga jual:{" "}
                  <span className="text-base">
                    {formatCurrency(Math.ceil(totalCost / (1 - Number(targetMargin) / 100)))}
                  </span>
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-amber-600 mt-1.5">
            Harga jual diperbarui otomatis saat Anda mengubah target atau menambah bahan.
          </p>
        </div>
      )}

      {/* Price & Overhead */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Harga Jual (Rp)"
          type="number"
          step="any"
          {...register(`${prefix}.price`)}
          error={errors.variants?.[variantIndex]?.price?.message}
          placeholder="35000"
        />
        <Input
          label="Biaya Overhead (Rp)"
          type="number"
          step="any"
          {...register(`${prefix}.overhead_cost`)}
          error={errors.variants?.[variantIndex]?.overhead_cost?.message}
          helperText="Listrik, tenaga kerja, kemasan, dll."
          placeholder="5000"
        />
      </div>

      {/* Cost Summary */}
      <div className="rounded-lg bg-white border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">KALKULASI BIAYA</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-gray-400">Biaya Bahan:</span>
          <span className="text-right font-medium">{formatCurrency(ingredientCost)}</span>
          <span className="text-gray-400">Biaya Overhead:</span>
          <span className="text-right font-medium">{formatCurrency(overheadVal)}</span>
          <span className="text-gray-400 font-semibold">Total Biaya:</span>
          <span className="text-right font-bold text-gray-800">{formatCurrency(totalCost)}</span>
          <span className="text-gray-400">Keuntungan:</span>
          <span className={`text-right font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(profit)} ({profitPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );

  // Flat mode: render body directly, no card/accordion wrapper
  if (isFlat) return bodyContent;

  // Variant mode: full accordion card with variant name header
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gray-400">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
          <div className="text-left min-w-0">
            <span className="font-semibold text-gray-900 text-sm">
              Varian {variantIndex + 1}:{" "}
              <Controller
                name={`${prefix}.variant_name`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Nama varian..."
                    className="border-0 border-b border-dashed border-gray-300 bg-transparent focus:outline-none focus:border-amber-500 px-1 py-0.5 font-semibold"
                    style={{ width: "180px" }}
                  />
                )}
              />
            </span>
            {sellingVal > 0 && (
              <span className="text-amber-700 font-bold ml-3 text-sm">
                {formatCurrency(sellingVal)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {totalCost > 0 && (
            <span className={`text-xs font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(profit)} ({profitPct.toFixed(0)}%)
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-red-400 hover:text-red-600 p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </button>

      {isExpanded && bodyContent}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook: shared ingredient data
// ──────────────────────────────────────────────────────────────────────────────

function useIngredientsData() {
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => getIngredients().then((r) => r.data),
  });
  const ingredientMap = useMemo(
    () =>
      Object.fromEntries(
        rawMaterials.map((m) => [String(m.id), { material_name: m.material_name, unit: m.unit, cost_per_unit: m.cost_per_unit }])
      ),
    [rawMaterials],
  );
  return { rawMaterials, ingredientMap };
}

// ──────────────────────────────────────────────────────────────────────────────
// MenuItemsTab
// ──────────────────────────────────────────────────────────────────────────────

function MenuItemsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const dSearch = useDebounce(search);

  // "Has Variants?" toggle — local UI state, not in form schema
  const [hasVariants, setHasVariants] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isPending: loadProd } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts().then((r) => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().then((r) => r.data),
  });
  const { data: bundles = [] } = useQuery({
    queryKey: ["all-bundles"],
    queryFn: () => getAllBundles().then((r) => r.data),
  });
  const { rawMaterials, ingredientMap } = useIngredientsData();

  // Bundles that contain the product being targeted for deletion
  const deleteTargetBundleWarning = useMemo(() => {
    if (!deleteTarget) return undefined;
    const affected = bundles.filter((b) =>
      b.BundleItems?.some((item) => item.product_id === deleteTarget.id)
    );
    if (!affected.length) return undefined;
    const names = affected.map((b) => `"${b.bundle_name}"`).join(", ");
    return `Menu ini terdapat dalam bundel ${names}. Hapus produk dari bundel tersebut terlebih dahulu sebelum menghapus menu ini.`;
  }, [deleteTarget, bundles]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const ms = !dSearch || p.product_name.toLowerCase().includes(dSearch.toLowerCase());
        const mc = catFilter === "all" || String(p.category_id) === catFilter;
        const st = statusFilter === "all" || p.status === statusFilter;
        return ms && mc && st;
      }),
    [products, dSearch, catFilter, statusFilter],
  );

  // ── Form ────────────────────────────────────────────────────────────────────
  const methods = useForm<MenuForm>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      status: "available",
      variants: [{ variant_name: "", price: 0, overhead_cost: 0, ingredients: [{ ingredient_id: 0, qty: 0 }] }],
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = methods;

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants",
  });

  // ── Image handlers ──────────────────────────────────────────────────────────
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
    setHasVariants(false);
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    reset({
      status: "available",
      variants: [{ variant_name: "", price: 0, overhead_cost: 0, ingredients: [{ ingredient_id: 0, qty: 0 }] }],
    });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setHasVariants((p.ProductVariants?.length ?? 0) > 1);
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(getMediaUrl(p.image_url) ?? "");
    if (imageInputRef.current) imageInputRef.current.value = "";

    const variants = p.ProductVariants?.length
      ? p.ProductVariants.map((v) => ({
          variant_name: v.variant_name,
          price: Number(v.price),
          overhead_cost: Number(v.overhead_cost),
          ingredients: v.VariantIngredients?.length
            ? v.VariantIngredients.map((vi) => ({
                ingredient_id: vi.raw_material_id,
                qty: Number(vi.quantity),
              }))
            : [{ ingredient_id: 0, qty: 0 }],
        }))
      : [{ variant_name: p.product_name, price: 0, overhead_cost: 0, ingredients: [{ ingredient_id: 0, qty: 0 }] }];

    reset({
      product_name: p.product_name,
      category_id: p.category_id,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      status: p.status,
      variants,
    });
    setOpen(true);
  };

  // ── Save mutation ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: MenuForm) => {
      const fd = new FormData();
      fd.append("category_id", String(Number(data.category_id)));
      fd.append("product_name", data.product_name);
      if (data.description) fd.append("description", data.description);
      fd.append("status", data.status);

      if (imageFile) {
        fd.append("image", imageFile);
      } else if (!imagePreview && editing) {
        fd.append("image_url", "");
      }

      // Build variants payload as JSON string in a single field
      const variantsPayload = data.variants.map((v) => ({
        variant_name: v.variant_name?.trim() || data.product_name,
        price: Number(v.price),
        overhead_cost: Number(v.overhead_cost),
        ingredients: v.ingredients.map((ing) => ({
          ingredient_id: Number(ing.ingredient_id),
          qty: Number(ing.qty),
        })),
      }));
      fd.append("variants", JSON.stringify(variantsPayload));

      if (editing) {
        await updateProduct(editing.id, fd);
      } else {
        await createProduct(fd);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Berhasil",
        description: editing ? "Menu diperbarui" : "Menu ditambahkan",
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

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (p: Product) => deleteProduct(p.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Berhasil", description: "Menu dihapus", variant: "success" });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Gagal menghapus";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  // ── Helper: compute cost summary for a product card ─────────────────────────
  const getProductCostSummary = (p: Product) => {
    const vars = p.ProductVariants ?? [];
    if (vars.length === 0) return null;
    const firstVar = vars[0];
    const ingCost = (firstVar.VariantIngredients ?? []).reduce((sum, vi) => {
      const mat = ingredientMap[String(vi.raw_material_id)];
      return sum + Number(vi.quantity || 0) * Number(mat?.cost_per_unit || 0);
    }, 0);
    const overhead = Number(firstVar.overhead_cost || 0);
    const total = ingCost + overhead;
    const price = Number(firstVar.price || 0);
    const profit = price - total;
    const pct = price > 0 ? (profit / price) * 100 : 0;
    return { ingCost, overhead, total, price, profit, pct };
  };

  const catOptions = [
    { value: "all", label: "Semua Kategori" },
    ...categories.map((c) => ({ value: String(c.id), label: c.category_name })),
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="h-9 w-52 pl-9 pr-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <Select options={catOptions} value={catFilter} onValueChange={setCatFilter} className="w-44" />
          <Select
            options={[
              { value: "all", label: "Semua Status" },
              { value: "available", label: "Tersedia" },
              { value: "out_of_stock", label: "Habis" },
            ]}
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-36"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Menu
        </Button>
      </div>

      {loadProd ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada menu"
          description="Tambahkan menu pertama Anda. Kelola varian dan resep dalam satu tempat."
          action={
            <Button onClick={openCreate} size="sm">
              Tambah Menu
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const costSummary = getProductCostSummary(p);
            const varCount = p.ProductVariants?.length ?? 0;
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {p.image_url ? (
                      <img
                        src={getMediaUrl(p.image_url)}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0">
                        {p.product_name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{p.product_name}</span>
                        <Badge variant="default">
                          {p.Category?.category_name || `Kat #${p.category_id}`}
                        </Badge>
                        <Badge variant={p.status === "available" ? "success" : "danger"}>
                          {p.status === "available" ? "Tersedia" : "Habis"}
                        </Badge>
                        {varCount > 1 && (
                          <Badge variant="info">{varCount} varian</Badge>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{p.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {costSummary && (
                      <>
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-gray-400">Harga</p>
                          <p className="font-bold text-amber-700">
                            {formatCurrency(costSummary.price)}
                          </p>
                        </div>
                        <div className="hidden lg:block text-right">
                          <p className="text-xs text-gray-400">Laba</p>
                          <p
                            className={`font-semibold text-sm ${costSummary.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(costSummary.profit)}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          qc.invalidateQueries({ queryKey: ["all-bundles"] });
                          setDeleteTarget(p);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {expanded === p.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === p.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    {p.ProductVariants && p.ProductVariants.length > 0 ? (
                      <div className="space-y-4">
                        {p.ProductVariants.map((v) => {
                          const vIngCost = (v.VariantIngredients ?? []).reduce(
                            (sum, vi) => {
                              const mat = ingredientMap[String(vi.raw_material_id)];
                              return sum + Number(vi.quantity || 0) * Number(mat?.cost_per_unit || 0);
                            },
                            0,
                          );
                          const vOverhead = Number(v.overhead_cost || 0);
                          const vTotal = vIngCost + vOverhead;
                          const vPrice = Number(v.price || 0);
                          const vProfit = vPrice - vTotal;
                          return (
                            <div key={v.id} className="bg-white rounded-lg border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-gray-900">{v.variant_name}</p>
                                  <p className="text-amber-700 font-bold text-sm">
                                    {formatCurrency(vPrice)}
                                  </p>
                                </div>
                                <div className="text-right text-xs">
                                  <p className="text-gray-400">Biaya: {formatCurrency(vTotal)}</p>
                                  <p className={`font-semibold ${vProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    Laba: {formatCurrency(vProfit)}
                                  </p>
                                </div>
                              </div>
                              {v.VariantIngredients && v.VariantIngredients.length > 0 && (
                                <div className="border-t pt-3">
                                  <p className="text-xs font-medium text-gray-500 mb-2">BAHAN:</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {v.VariantIngredients.map((vi) => {
                                      const mat = vi.RawMaterial || ingredientMap[String(vi.raw_material_id)];
                                      return (
                                        <div
                                          key={vi.id}
                                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                                        >
                                          <span className="text-gray-700">
                                            {mat?.material_name || `#${vi.raw_material_id}`}
                                          </span>
                                          <span className="font-medium text-gray-900 ml-2">
                                            {Number(vi.quantity)} {mat?.unit}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Belum ada varian.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Menu: ${editing.product_name}` : "Tambah Menu Baru"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="space-y-5"
          >
          <FormProvider {...methods}>
            {/* ── Global Info Section ────────────────────────────────────────── */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Info Menu
              </h3>
              <Input
                label="Nama Menu"
                {...register("product_name")}
                error={errors.product_name?.message}
                placeholder="Contoh: Gula Aren, Americano, Latte"
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="category_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Kategori"
                      options={categories.map((c) => ({
                        value: String(c.id),
                        label: c.category_name,
                      }))}
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(v) => field.onChange(Number(v))}
                      error={errors.category_id?.message}
                    />
                  )}
                />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Status"
                      options={[
                        { value: "available", label: "Tersedia" },
                        { value: "out_of_stock", label: "Habis" },
                      ]}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v)}
                    />
                  )}
                />
              </div>
              <Input
                label="Deskripsi (opsional)"
                {...register("description")}
                placeholder="Deskripsi singkat menu..."
              />

              {/* Image upload */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1.5">
                  Gambar Menu (opsional)
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
            </div>

            {/* ── Variants Toggle ────────────────────────────────────────────── */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Varian & Resep
                </h3>
                <ToggleSwitch
                  checked={hasVariants}
                  onChange={(v) => {
                    setHasVariants(v);
                    if (!v) {
                      // Collapse to single variant
                      // Keep first variant, reset others if any
                    }
                  }}
                  label="Memiliki Varian?"
                />
              </div>

              <div className="space-y-3">
                {variantFields.map((field, idx) => (
                  <Fragment key={field.id}>
                    {(hasVariants || idx === 0) && (
                      <VariantCard
                        variantIndex={idx}
                        onRemove={() => removeVariant(idx)}
                        canRemove={hasVariants && variantFields.length > 1}
                        isFlat={!hasVariants}
                        rawMaterials={rawMaterials}
                        ingredientMap={ingredientMap}
                      />
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Add variant button — only shown when hasVariants is on */}
              {hasVariants && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full border-dashed"
                  onClick={() =>
                    appendVariant({
                      variant_name: "",
                      price: 0,
                      overhead_cost: 0,
                      ingredients: [{ ingredient_id: 0, qty: 0 }],
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Tambah Varian
                </Button>
              )}
            </div>

            {errors.variants && typeof errors.variants.message === "string" && (
              <p className="text-sm text-red-600">{errors.variants.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? "Simpan Perubahan" : "Tambah Menu"}
              </Button>
            </DialogFooter>
          </FormProvider>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Menu"
        description={`Hapus menu "${deleteTarget?.product_name}" beserta semua varian dan resepnya?`}
        warning={deleteTargetBundleWarning}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Categories Tab
// ──────────────────────────────────────────────────────────────────────────────

const catSchema = z.object({
  category_name: z.string().min(1, "Nama kategori wajib diisi"),
});
type CatForm = z.infer<typeof catSchema>;

function CategoriesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories = [], isPending } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CatForm>({
    resolver: zodResolver(catSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CatForm) =>
      editing ? updateCategory(editing.id, data) : createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Berhasil",
        variant: "success",
        description: editing ? "Kategori diperbarui" : "Kategori ditambahkan",
      });
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast({
        title: "Gagal",
        description:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Error",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Berhasil", description: "Kategori dihapus", variant: "success" });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      toast({
        title: "Gagal",
        description:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Error",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            reset({ category_name: "" });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>
      {isPending ? (
        <PageLoader />
      ) : categories.length === 0 ? (
        <EmptyState title="Belum ada kategori" description="Tambahkan kategori untuk mengelompokkan menu" />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead>Nama Kategori</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.category_name}</TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {new Date(c.createdAt).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditing(c);
                        reset({ category_name: c.category_name });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableWrapper>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <Input
              label="Nama Kategori"
              {...register("category_name")}
              error={errors.category_name?.message}
              placeholder="Contoh: Kopi, Teh, Makanan"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Kategori"
        description={`Hapus kategori "${deleteTarget?.category_name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MenuPage (Tabs Wrapper)
// ──────────────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  return (
    <Tabs defaultValue="menu-items">
      <TabsList>
        <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
        <TabsTrigger value="categories">Kategori</TabsTrigger>
      </TabsList>
      <TabsContent value="menu-items">
        <MenuItemsTab />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesTab />
      </TabsContent>
    </Tabs>
  );
}
