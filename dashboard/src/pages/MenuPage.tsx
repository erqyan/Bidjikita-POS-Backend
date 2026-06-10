/**
 * MenuPage – Unified menu management.
 *
 * "Menu Item" = Product + Recipe combined.
 * Creating a menu item requires:
 *   1. Basic info (name, category, image, selling price, overhead cost)
 *   2. Ingredients list  →  system calculates ingredient cost automatically
 *   3. Cost summary shown live: ingredient cost + overhead = total cost → profit
 *
 * Tabs:  Menu Items | Kategori | Varian
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import {
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from "@/api/variants";
import { getIngredients } from "@/api/ingredients";
import {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/api/recipes";
import type { Category, Product, ProductVariant, Recipe } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
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
import { formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

// ──────────────────────────────────────────────────────────────────────────────
// Menu Items Tab — unified Product + Recipe creation
// ──────────────────────────────────────────────────────────────────────────────

const menuSchema = z.object({
  product_name: z.string().min(1, "Nama menu wajib diisi"),
  category_id: z.coerce.number().min(1, "Pilih kategori"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  selling_price: z.coerce.number().min(1, "Harga jual wajib diisi"),
  overhead_cost: z.coerce.number().min(0).default(0),
  status: z.enum(["available", "out_of_stock"]).default("available"),
  recipe_name: z.string().min(1, "Nama resep wajib diisi"),
  ingredients: z
    .array(
      z.object({
        raw_material_id: z.coerce.number().min(1, "Pilih bahan"),
        quantity: z.coerce.number().min(0.001, "Jumlah harus > 0"),
      }),
    )
    .min(1, "Tambahkan minimal satu bahan"),
});
type MenuForm = z.infer<typeof menuSchema>;

interface EditingMenu {
  product: Product;
  recipe: Recipe | null;
}

function MenuItemsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingMenu | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  // Target margin for auto-price calculation
  const [targetMargin, setTargetMargin] = useState<string>("");
  // Ref to skip the auto-price effect when the price was typed manually
  const manualPriceEntry = useRef(false);
  const dSearch = useDebounce(search);

  const { data: products = [], isPending: loadProd } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts().then((r) => r.data),
  });
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => getRecipes().then((r) => r.data),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().then((r) => r.data),
  });
  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => getIngredients().then((r) => r.data),
  });

  const ingredientMap = useMemo(
    () => Object.fromEntries(rawMaterials.map((i) => [String(i.id), i])),
    [rawMaterials],
  );

  // Join each product with its base recipe (no variant, or first)
  const menuItems = useMemo(
    () =>
      products.map((p) => ({
        product: p,
        recipe:
          recipes.find((r) => r.product_id === p.id && !r.variant_id) ?? null,
      })),
    [products, recipes],
  );

  const filtered = useMemo(
    () =>
      menuItems.filter(({ product: p }) => {
        const ms =
          !dSearch ||
          p.product_name.toLowerCase().includes(dSearch.toLowerCase());
        const mc = catFilter === "all" || String(p.category_id) === catFilter;
        const st = statusFilter === "all" || p.status === statusFilter;
        return ms && mc && st;
      }),
    [menuItems, dSearch, catFilter, statusFilter],
  );

  // ── Form ────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MenuForm>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      overhead_cost: 0,
      selling_price: 0,
      status: "available",
      ingredients: [{ raw_material_id: 0, quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ingredients",
  });

  // Live cost calculation — computed directly each render (no useMemo).
  // useMemo caused a stale-cache bug because useFieldArray mutates the
  // same array reference instead of creating a new one.
  const watchIngredients = watch("ingredients") ?? [];
  const watchSelling = watch("selling_price");
  const watchOverhead = watch("overhead_cost");

  const ingredientCostCalc = watchIngredients.reduce((sum, item) => {
    const mat = ingredientMap[String(item.raw_material_id)];
    if (!mat) return sum;
    return sum + (Number(item.quantity) || 0) * Number(mat.cost_per_unit || 0);
  }, 0);

  const overheadVal = Number(watchOverhead) || 0;
  const totalCost = ingredientCostCalc + overheadVal;
  const sellingVal = Number(watchSelling) || 0;
  const profit = sellingVal - totalCost;
  const profitPct = sellingVal > 0 ? (profit / sellingVal) * 100 : 0;

  // Auto-set selling price when targetMargin or totalCost changes.
  // Skipped for one cycle when the price was edited manually to prevent
  // the effect from overwriting what the user just typed.
  useEffect(() => {
    if (manualPriceEntry.current) {
      manualPriceEntry.current = false;
      return;
    }
    const m = Number(targetMargin);
    if (m > 0 && m < 100 && totalCost > 0) {
      const autoPrice = Math.ceil(totalCost / (1 - m / 100));
      setValue("selling_price", autoPrice, { shouldValidate: false });
    }
  }, [targetMargin, totalCost, setValue]);

  const openCreate = () => {
    setEditing(null);
    setSelectedProductId("");
    setTargetMargin("");
    reset({
      overhead_cost: 0,
      selling_price: 0,
      status: "available",
      ingredients: [{ raw_material_id: 0, quantity: 0 }],
    });
    setOpen(true);
  };

  const openEdit = ({ product: p, recipe: r }: EditingMenu) => {
    setEditing({ product: p, recipe: r });
    setSelectedProductId(String(p.id));
    setTargetMargin("");
    reset({
      product_name: p.product_name,
      category_id: p.category_id,
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      selling_price: Number(p.selling_price),
      overhead_cost: Number(p.overhead_cost),
      status: p.status,
      recipe_name: r?.recipe_name ?? p.product_name,
      ingredients: r?.RecipeDetails?.length
        ? r.RecipeDetails.map((d) => ({
            raw_material_id: d.raw_material_id,
            quantity: Number(d.quantity),
          }))
        : [{ raw_material_id: 0, quantity: 0 }],
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: MenuForm) => {
      const productPayload = {
        category_id: Number(data.category_id),
        product_name: data.product_name,
        description: data.description,
        image_url: data.image_url,
        selling_price: Number(data.selling_price),
        overhead_cost: Number(data.overhead_cost),
        base_price: Number(data.selling_price),
        status: data.status,
      };

      const recipePayload = {
        recipe_name: data.recipe_name,
        product_id: 0, // set below
        variant_id: null,
        materials: data.ingredients.map((i) => ({
          raw_material_id: Number(i.raw_material_id),
          quantity: Number(i.quantity),
        })),
      };

      if (editing) {
        // Update product
        await updateProduct(editing.product.id, productPayload);
        recipePayload.product_id = editing.product.id;

        if (editing.recipe) {
          await updateRecipe(editing.recipe.id, recipePayload);
        } else {
          await createRecipe(recipePayload);
        }
      } else {
        // Create product first, then recipe
        const { data: newProduct } = await createProduct(productPayload);
        recipePayload.product_id = newProduct.id;
        await createRecipe(recipePayload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
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

  const deleteMutation = useMutation({
    mutationFn: async (p: Product) => {
      // Delete associated recipes first
      const rel = recipes.filter((r) => r.product_id === p.id);
      for (const r of rel) await deleteRecipe(r.id);
      await deleteProduct(p.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast({
        title: "Berhasil",
        description: "Menu dihapus",
        variant: "success",
      });
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

  // ── Cost display helper ─────────────────────────────────────────────────────
  function ProductCostSummary({ p }: { p: Product }) {
    const total = Number(p.base_cost) + Number(p.overhead_cost);
    const pft = Number(p.selling_price) - total;
    const pct =
      Number(p.selling_price) > 0 ? (pft / Number(p.selling_price)) * 100 : 0;
    return (
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-400">Biaya Bahan:</span>
        <span className="text-right font-medium">
          {formatCurrency(p.base_cost)}
        </span>
        <span className="text-gray-400">Overhead:</span>
        <span className="text-right font-medium">
          {formatCurrency(p.overhead_cost)}
        </span>
        <span className="text-gray-600 font-semibold border-t pt-1">
          Total Biaya:
        </span>
        <span className="text-right font-semibold border-t pt-1">
          {formatCurrency(total)}
        </span>
        <span className="text-gray-600 font-semibold">Harga Jual:</span>
        <span className="text-right font-semibold text-amber-700">
          {formatCurrency(p.selling_price)}
        </span>
        <span className="text-gray-600 font-semibold">Keuntungan:</span>
        <span
          className={`text-right font-bold ${pft >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {formatCurrency(pft)} ({pct.toFixed(1)}%)
        </span>
      </div>
    );
  }

  const catOptions = [
    { value: "all", label: "Semua Kategori" },
    ...categories.map((c) => ({ value: String(c.id), label: c.category_name })),
  ];

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
          <Select
            options={catOptions}
            value={catFilter}
            onValueChange={setCatFilter}
            className="w-44"
          />
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
          description="Tambahkan menu pertama Anda. Sistem akan menghitung biaya secara otomatis dari bahan-bahan yang digunakan."
          action={
            <Button onClick={openCreate} size="sm">
              Tambah Menu
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ product: p, recipe: r }) => (
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
                  {/* Image or placeholder */}
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0">
                      {p.product_name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {p.product_name}
                      </span>
                      <Badge variant="default">
                        {p.Category?.category_name || `Kat #${p.category_id}`}
                      </Badge>
                      <Badge
                        variant={
                          p.status === "available" ? "success" : "danger"
                        }
                      >
                        {p.status === "available" ? "Tersedia" : "Habis"}
                      </Badge>
                      {!r && <Badge variant="warning">Belum ada resep</Badge>}
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Quick cost info */}
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-400">Harga Jual</p>
                    <p className="font-bold text-amber-700">
                      {formatCurrency(p.selling_price)}
                    </p>
                  </div>
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-gray-400">Keuntungan</p>
                    <p
                      className={`font-semibold text-sm ${Number(p.selling_price) - Number(p.base_cost) - Number(p.overhead_cost) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(
                        Number(p.selling_price) -
                          Number(p.base_cost) -
                          Number(p.overhead_cost),
                      )}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit({ product: p, recipe: r });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ingredients */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Bahan-bahan Resep
                      </p>
                      {r?.RecipeDetails && r.RecipeDetails.length > 0 ? (
                        <div className="space-y-1.5">
                          {r.RecipeDetails.map((d) => {
                            const mat =
                              d.RawMaterial ||
                              ingredientMap[String(d.raw_material_id)];
                            const lineTotal =
                              Number(d.quantity) *
                              Number(mat?.cost_per_unit || 0);
                            return (
                              <div
                                key={d.id}
                                className="flex items-center justify-between text-sm rounded-lg bg-white border border-gray-100 px-3 py-2"
                              >
                                <div>
                                  <span className="font-medium text-gray-800">
                                    {mat?.material_name || "Unknown"}
                                  </span>
                                  <span className="text-gray-400 ml-2">
                                    {Number(d.quantity)} {mat?.unit}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-400 text-xs">
                                    {formatCurrency(mat?.cost_per_unit || 0)}/
                                    {mat?.unit}
                                  </span>
                                  <span className="font-semibold text-gray-700 ml-3">
                                    {formatCurrency(lineTotal)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Belum ada bahan dalam resep
                        </p>
                      )}
                    </div>

                    {/* Cost breakdown */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Kalkulasi Biaya
                      </p>
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <ProductCostSummary p={p} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Edit Menu: ${editing.product.product_name}`
                : "Tambah Menu Baru"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="space-y-5"
          >
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nama Menu"
                {...register("product_name")}
                error={errors.product_name?.message}
                placeholder="Contoh: Americano, Latte, Caramel Macchiato"
                className="col-span-2"
              />
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
              <Input
                label="Deskripsi (opsional)"
                {...register("description")}
                placeholder="Deskripsi singkat menu..."
                className="col-span-2"
              />
              <Input
                label="URL Gambar (opsional)"
                {...register("image_url")}
                placeholder="https://..."
                className="col-span-2"
              />
            </div>

            {/* Recipe name */}
            <div className="border-t pt-4">
              <Input
                label="Nama Resep"
                {...register("recipe_name")}
                error={errors.recipe_name?.message}
                placeholder="Sama dengan nama menu, atau lebih spesifik"
              />
            </div>

            {/* Ingredients — placed BEFORE pricing so the cost is known first */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Bahan-bahan</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ raw_material_id: 0, quantity: 0 })}
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Bahan
                </Button>
              </div>

              {errors.ingredients &&
                typeof errors.ingredients.message === "string" && (
                  <p className="text-xs text-red-600 mb-2">
                    {errors.ingredients.message}
                  </p>
                )}

              {/* Header row */}
              {fields.length > 0 && (
                <div className="grid grid-cols-[1fr_100px_80px_auto] gap-2 mb-1 px-1">
                  <span className="text-xs font-medium text-gray-400">
                    Bahan
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    Jumlah
                  </span>
                  <span className="text-xs font-medium text-gray-400 text-right">
                    Biaya Bahan
                  </span>
                  <span />
                </div>
              )}

              <div className="space-y-2">
                {fields.map((field, idx) => {
                  const selectedMat =
                    ingredientMap[
                      String(watchIngredients?.[idx]?.raw_material_id)
                    ];
                  const qty = Number(watchIngredients?.[idx]?.quantity) || 0;
                  const lineTotal = selectedMat
                    ? qty * Number(selectedMat.cost_per_unit)
                    : 0;

                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_100px_80px_auto] gap-2 items-start"
                    >
                      <Controller
                        name={`ingredients.${idx}.raw_material_id`}
                        control={control}
                        render={({ field: f }) => (
                          <Select
                            options={rawMaterials.map((i) => ({
                              value: String(i.id),
                              label: `${i.material_name} (${formatCurrency(i.cost_per_unit)}/${i.unit})`,
                            }))}
                            value={f.value ? String(f.value) : undefined}
                            onValueChange={(v) => f.onChange(Number(v))}
                            placeholder="Pilih bahan..."
                            error={
                              errors.ingredients?.[idx]?.raw_material_id
                                ?.message
                            }
                          />
                        )}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="Qty"
                          className="w-full h-9 px-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                          {...register(`ingredients.${idx}.quantity`)}
                        />
                        {selectedMat && (
                          <span className="text-xs text-gray-400 shrink-0">
                            {selectedMat.unit}
                          </span>
                        )}
                      </div>
                      <div className="h-9 flex items-center justify-end pr-1">
                        <span
                          className={`text-xs font-semibold ${lineTotal > 0 ? "text-gray-700" : "text-gray-300"}`}
                        >
                          {lineTotal > 0 ? formatCurrency(lineTotal) : "–"}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-400 hover:bg-red-50 mt-0.5"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing — comes AFTER ingredients so target-margin can see the cost */}
            <div className="border-t pt-4 space-y-3">
              {/* Overhead cost */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Biaya Overhead per Porsi (Rp)"
                  type="number"
                  min="0"
                  {...register("overhead_cost")}
                  error={errors.overhead_cost?.message}
                  helperText="Listrik, tenaga kerja, packaging, dll."
                />
              </div>

              {/* Target margin auto-price helper */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800 mb-2">
                  Hitung Harga dari Target Keuntungan
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      step="1"
                      placeholder="Mis. 60"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(e.target.value)}
                      className="h-9 w-24 px-2 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-sm font-semibold text-amber-800">
                      %
                    </span>
                    <span className="text-xs text-amber-600 ml-1">
                      keuntungan
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-amber-400">→</span>
                    {Number(targetMargin) > 0 && Number(targetMargin) < 100 ? (
                      totalCost > 0 ? (
                        <span className="font-bold text-amber-800">
                          Harga jual:{" "}
                          <span className="text-base">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0,
                            }).format(
                              Math.ceil(
                                totalCost / (1 - Number(targetMargin) / 100),
                              ),
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className="text-amber-600 italic text-xs">
                          Tambahkan bahan-bahan terlebih dahulu
                        </span>
                      )
                    ) : (
                      <span className="text-amber-500 italic text-xs">
                        {targetMargin === ""
                          ? "Masukkan persentase untuk menghitung harga"
                          : "Masukkan 1–99%"}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-1.5">
                  Harga jual diperbarui otomatis saat Anda mengubah margin atau
                  menambah bahan.
                </p>
              </div>

              {/* Selling price — placed below the calculator so the computed
                  value is visible right above the editable field */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Harga Jual (Rp)"
                  type="number"
                  min="0"
                  {...register("selling_price")}
                  error={errors.selling_price?.message}
                  helperText="Harga yang dibayar pelanggan"
                  onChange={(e) => {
                    register("selling_price").onChange(e);
                    const price = Number(e.target.value);
                    if (price > 0 && totalCost > 0) {
                      // Fill the margin field to reflect the manual price;
                      // set the flag so the auto-price effect doesn't overwrite it.
                      manualPriceEntry.current = true;
                      const margin = ((price - totalCost) / price) * 100;
                      setTargetMargin(margin.toFixed(1));
                    } else {
                      setTargetMargin("");
                    }
                  }}
                />
              </div>
            </div>

            {/* Live cost summary */}
            <div
              className={`rounded-xl border p-4 ${profit >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Kalkulasi Biaya
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-gray-600">Biaya bahan-bahan:</span>
                <span className="text-right font-medium">
                  {formatCurrency(ingredientCostCalc)}
                </span>
                <span className="text-gray-600">Biaya overhead/porsi:</span>
                <span className="text-right font-medium">
                  {formatCurrency(overheadVal)}
                </span>
                <span className="text-gray-800 font-semibold border-t pt-1.5">
                  Total biaya / porsi:
                </span>
                <span className="text-right font-bold border-t pt-1.5">
                  {formatCurrency(totalCost)}
                </span>
                <span className="text-gray-800 font-semibold">Harga jual:</span>
                <span className="text-right font-bold text-amber-700">
                  {formatCurrency(sellingVal)}
                </span>
                <span
                  className={`font-bold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {profit >= 0 ? "Keuntungan:" : "Kerugian:"}
                </span>
                <span
                  className={`text-right font-bold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}
                >
                  {formatCurrency(Math.abs(profit))}
                  <span className="text-xs ml-1">
                    ({profitPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
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
                {editing ? "Simpan Perubahan" : "Tambah Menu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Menu"
        description={`Hapus menu "${deleteTarget?.product_name}" beserta resepnya? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus Menu"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Categories Tab (unchanged from before)
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CatForm>({ resolver: zodResolver(catSchema) });

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
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Error",
        variant: "destructive",
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Berhasil",
        description: "Kategori dihapus",
        variant: "success",
      });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      toast({
        title: "Gagal",
        description:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Error",
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
            reset({});
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>
      {isPending ? (
        <PageLoader />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Belum ada kategori"
          action={
            <Button
              onClick={() => {
                reset({});
                setOpen(true);
              }}
              size="sm"
            >
              Tambah
            </Button>
          }
        />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead>No</TableHead>
              <TableHead>Nama Kategori</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {categories.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-gray-500">{i + 1}</TableCell>
                <TableCell className="font-medium">{c.category_name}</TableCell>
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
            <DialogTitle>
              {editing ? "Edit Kategori" : "Tambah Kategori"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Nama Kategori"
              {...register("category_name")}
              error={errors.category_name?.message}
              placeholder="Contoh: Kopi, Non-Kopi, Snack"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
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
// Variants Tab (unchanged from before)
// ──────────────────────────────────────────────────────────────────────────────
const varSchema = z.object({
  product_id: z.coerce.number().min(1, "Pilih produk"),
  variant_name: z.string().min(1, "Nama varian wajib diisi"),
  additional_price: z.coerce.number().min(0),
});
type VarForm = z.infer<typeof varSchema>;

function VariantsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
  const [productFilter, setProductFilter] = useState("all");

  const { data: variants = [], isPending } = useQuery({
    queryKey: ["variants"],
    queryFn: () => getVariants().then((r) => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts().then((r) => r.data),
  });
  const filtered = useMemo(
    () =>
      variants.filter(
        (v) =>
          productFilter === "all" || String(v.product_id) === productFilter,
      ),
    [variants, productFilter],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VarForm>({
    resolver: zodResolver(varSchema),
    defaultValues: { additional_price: 0 },
  });

  const saveMutation = useMutation({
    mutationFn: (data: VarForm) =>
      editing ? updateVariant(editing.id, data) : createVariant(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variants"] });
      toast({
        title: "Berhasil",
        variant: "success",
        description: editing ? "Varian diperbarui" : "Varian ditambahkan",
      });
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast({
        title: "Gagal",
        description:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Error",
        variant: "destructive",
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVariant(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variants"] });
      toast({
        title: "Berhasil",
        description: "Varian dihapus",
        variant: "success",
      });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      toast({
        title: "Gagal",
        description:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Error",
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const productMap = Object.fromEntries(
    products.map((p) => [p.id, p.product_name]),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Select
          options={[
            { value: "all", label: "Semua Menu" },
            ...products.map((p) => ({
              value: String(p.id),
              label: p.product_name,
            })),
          ]}
          value={productFilter}
          onValueChange={setProductFilter}
          className="w-52"
        />
        <Button
          onClick={() => {
            setEditing(null);
            reset({ additional_price: 0 });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tambah Varian
        </Button>
      </div>
      {isPending ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Belum ada varian"
          description="Varian memungkinkan satu menu memiliki beberapa pilihan ukuran/add-on dengan harga berbeda."
        />
      ) : (
        <TableWrapper>
          <TableHeader>
            <tr>
              <TableHead>Nama Varian</TableHead>
              <TableHead>Menu</TableHead>
              <TableHead>Harga Tambahan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.variant_name}</TableCell>
                <TableCell className="text-gray-600">
                  {productMap[v.product_id] || "-"}
                </TableCell>
                <TableCell className="font-semibold text-amber-700">
                  +{formatCurrency(v.additional_price)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditing(v);
                        reset({
                          product_id: v.product_id,
                          variant_name: v.variant_name,
                          additional_price: v.additional_price,
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteTarget(v)}
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
            <DialogTitle>
              {editing ? "Edit Varian" : "Tambah Varian"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="space-y-4"
          >
            <Controller
              name="product_id"
              control={control}
              render={({ field }) => (
                <Select
                  label="Menu"
                  options={products.map((p) => ({
                    value: String(p.id),
                    label: p.product_name,
                  }))}
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                  error={errors.product_id?.message}
                />
              )}
            />
            <Input
              label="Nama Varian"
              {...register("variant_name")}
              error={errors.variant_name?.message}
              placeholder="Contoh: Medium, Large, Extra Shot"
            />
            <Input
              label="Harga Tambahan (Rp)"
              type="number"
              {...register("additional_price")}
              error={errors.additional_price?.message}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
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
        title="Hapus Varian"
        description={`Hapus varian "${deleteTarget?.variant_name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────────────────────────────────
export default function MenuPage() {
  return (
    <div>
      <Tabs defaultValue="menu-items">
        <TabsList>
          <TabsTrigger value="menu-items">☕ Menu & Resep</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
          <TabsTrigger value="variants">Varian</TabsTrigger>
        </TabsList>
        <TabsContent value="menu-items">
          <MenuItemsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="variants">
          <VariantsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
