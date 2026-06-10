import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  getRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "@/api/recipes";
import { getProducts } from "@/api/products";
import { getVariants } from "@/api/variants";
import { getIngredients } from "@/api/ingredients";
import type { Recipe } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/Spinner";
import { useToast } from "@/store/toastStore";

const schema = z.object({
  recipe_name: z.string().min(1, "Nama resep wajib diisi"),
  product_id: z.coerce.number().min(1, "Pilih produk"),
  variant_id: z.coerce.number().nullable().optional(),
  materials: z
    .array(
      z.object({
        raw_material_id: z.coerce.number().min(1, "Pilih bahan"),
        quantity: z.coerce.number().min(0.001, "Jumlah harus > 0"),
      }),
    )
    .min(1, "Tambahkan minimal satu bahan"),
});
type FormData = z.infer<typeof schema>;

export default function RecipesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const { data: recipes = [], isPending } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => getRecipes().then((r) => r.data),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts().then((r) => r.data),
  });
  const { data: variants = [] } = useQuery({
    queryKey: ["variants"],
    queryFn: () => getVariants().then((r) => r.data),
  });
  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => getIngredients().then((r) => r.data),
  });

  const filteredVariants = variants.filter(
    (v) => !selectedProductId || String(v.product_id) === selectedProductId,
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { materials: [{ raw_material_id: 0, quantity: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "materials",
  });

  const openCreate = () => {
    setEditing(null);
    setSelectedProductId("");
    reset({ materials: [{ raw_material_id: 0, quantity: 0 }] });
    setOpen(true);
  };

  const openEdit = (r: Recipe) => {
    setEditing(r);
    setSelectedProductId(String(r.product_id));
    reset({
      recipe_name: r.recipe_name,
      product_id: r.product_id,
      variant_id: r.variant_id ?? null,
      materials: r.RecipeDetails?.map((d) => ({
        raw_material_id: d.raw_material_id,
        quantity: d.quantity,
      })) || [{ raw_material_id: 0, quantity: 0 }],
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData): Promise<void> => {
      const payload = {
        ...data,
        variant_id: data.variant_id || null,
        materials: data.materials.map((m) => ({
          raw_material_id: Number(m.raw_material_id),
          quantity: Number(m.quantity),
        })),
      };
      if (editing) {
        await updateRecipe(editing.id, payload);
      } else {
        await createRecipe(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast({
        title: "Berhasil",
        description: editing ? "Resep diperbarui" : "Resep ditambahkan",
        variant: "success",
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
    mutationFn: (id: number) => deleteRecipe(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recipes"] });
      toast({
        title: "Berhasil",
        description: "Resep dihapus",
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

  const ingredientMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {recipes.length} resep terdaftar
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Resep
        </Button>
      </div>

      {isPending ? (
        <PageLoader />
      ) : recipes.length === 0 ? (
        <EmptyState
          title="Belum ada resep"
          description="Tambahkan resep untuk produk Anda"
          action={
            <Button onClick={openCreate} size="sm">
              Tambah Resep
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() =>
                        setExpanded(expanded === r.id ? null : r.id)
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expanded === r.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {r.recipe_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-gray-500">
                          {r.Product?.product_name}
                        </span>
                        {r.ProductVariant && (
                          <Badge variant="info">
                            {r.ProductVariant.variant_name}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400">
                          · {r.RecipeDetails?.length || 0} bahan
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {expanded === r.id &&
                  r.RecipeDetails &&
                  r.RecipeDetails.length > 0 && (
                    <div className="mt-3 ml-7 border-t pt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        BAHAN-BAHAN:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {r.RecipeDetails.map((d) => {
                          const mat =
                            d.RawMaterial || ingredientMap[d.raw_material_id];
                          return (
                            <div
                              key={d.id}
                              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                            >
                              <span className="text-gray-700">
                                {mat?.material_name || "Unknown"}
                              </span>
                              <span className="font-medium text-gray-900 ml-2">
                                {d.quantity} {mat?.unit}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Resep" : "Tambah Resep"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) => saveMutation.mutate(d))}
            className="space-y-4"
          >
            <Input
              label="Nama Resep"
              {...register("recipe_name")}
              error={errors.recipe_name?.message}
              placeholder="Contoh: Americano Medium"
            />
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="product_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Produk"
                    options={products.map((p) => ({
                      value: String(p.id),
                      label: p.product_name,
                    }))}
                    value={field.value ? String(field.value) : undefined}
                    onValueChange={(v) => {
                      field.onChange(Number(v));
                      setSelectedProductId(v);
                      setValue("variant_id", null);
                    }}
                    error={errors.product_id?.message}
                  />
                )}
              />
              <Controller
                name="variant_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Varian (Opsional)"
                    options={[
                      { value: "0", label: "Semua Varian" },
                      ...filteredVariants.map((v) => ({
                        value: String(v.id),
                        label: v.variant_name,
                      })),
                    ]}
                    value={field.value ? String(field.value) : "0"}
                    onValueChange={(v) =>
                      field.onChange(v === "0" ? null : Number(v))
                    }
                  />
                )}
              />
            </div>

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
              {errors.materials &&
                typeof errors.materials.message === "string" && (
                  <p className="text-xs text-red-600 mb-2">
                    {errors.materials.message}
                  </p>
                )}
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Controller
                        name={`materials.${idx}.raw_material_id`}
                        control={control}
                        render={({ field: f }) => (
                          <Select
                            options={ingredients.map((i) => ({
                              value: String(i.id),
                              label: `${i.material_name} (${i.unit})`,
                            }))}
                            value={f.value ? String(f.value) : undefined}
                            onValueChange={(v) => f.onChange(Number(v))}
                            placeholder="Pilih bahan..."
                            error={
                              errors.materials?.[idx]?.raw_material_id?.message
                            }
                          />
                        )}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Jumlah"
                        {...register(`materials.${idx}.quantity`)}
                        error={errors.materials?.[idx]?.quantity?.message}
                      />
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="mt-1 text-red-400 hover:bg-red-50"
                        onClick={() => remove(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
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
                {editing ? "Simpan" : "Tambah Resep"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus Resep"
        description={`Hapus resep "${deleteTarget?.recipe_name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
        confirmLabel="Hapus"
      />
    </div>
  );
}
