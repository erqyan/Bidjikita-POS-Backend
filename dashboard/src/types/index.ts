export interface Role {
  id: number;
  role_name: string;
}

export interface User {
  id: number;
  full_name: string;
  username: string;
  phone_number?: string;
  is_active: boolean;
  last_login?: string;
  role_id: number;
  Role?: Role;
  createdAt?: string;
}

export interface Category {
  id: number;
  category_name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: number;
  variant_name: string;
  additional_price: number;
  product_id: number;
}

export interface Product {
  id: number;
  product_name: string;
  description?: string;
  base_price: number;
  /** Auto-calculated from recipe ingredient costs */
  base_cost: number;
  /** Fixed cost per serving: electricity, labor, packaging, etc. */
  overhead_cost: number;
  /** Total cost = base_cost + overhead_cost */
  selling_price: number;
  /** Derived: (selling_price - total_cost) / selling_price × 100 */
  profit_margin: number;
  status: "available" | "out_of_stock";
  is_active: boolean;
  image_url?: string;
  category_id: number;
  Category?: Category;
  ProductVariants?: ProductVariant[];
  createdAt?: string;
}

export interface RawMaterial {
  id: number;
  material_name: string;
  unit: string;
  stock: number;
  minimum_stock: number;
  /** Cost per unit of measure (e.g. cost per gram, per ml) */
  cost_per_unit: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeDetail {
  id: number;
  quantity: number;
  raw_material_id: number;
  RawMaterial?: RawMaterial;
}

export interface Recipe {
  id: number;
  recipe_name: string;
  product_id: number;
  variant_id?: number | null;
  createdAt: string;
  Product?: Pick<Product, "id" | "product_name">;
  ProductVariant?: Pick<ProductVariant, "id" | "variant_name">;
  RecipeDetails?: RecipeDetail[];
}

export interface BundleItem {
  id: number;
  bundle_id: number;
  product_id: number;
  quantity: number;
  Product?: Pick<
    Product,
    "id" | "product_name" | "base_cost" | "selling_price"
  >;
}

export interface Bundle {
  id: number;
  bundle_name: string;
  description?: string;
  bundle_price: number;
  total_bundle_cost: number;
  bundle_profit: number;
  is_active: boolean;
  BundleItems?: BundleItem[];
  createdAt?: string;
}

export interface OrderDetail {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  Product?: Pick<Product, "id" | "product_name" | "base_price">;
  ProductVariant?: Pick<
    ProductVariant,
    "id" | "variant_name" | "additional_price"
  >;
}

export interface Shift {
  id: number;
  shift_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: "open" | "closed";
  createdAt?: string;
}

export interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  order_status: "pending" | "completed" | "cancelled";
  notes?: string;
  user_id: number;
  shift_id: number;
  createdAt: string;
  User?: Pick<User, "id" | "full_name" | "username">;
  Shift?: Pick<Shift, "id" | "shift_name">;
  OrderDetails?: OrderDetail[];
}

export interface Transaction {
  id: number;
  invoice_number: string;
  transaction_date: string;
  total_amount: number;
  payment_method: "cash" | "qris" | "debit" | "credit";
  payment_status: "pending" | "paid" | "failed";
  notes?: string;
  order_id: number;
  user_id: number;
  shift_id: number;
  User?: Pick<User, "id" | "full_name" | "username">;
  Shift?: Pick<Shift, "id" | "shift_name" | "shift_date" | "status">;
  Order?: Order;
  createdAt?: string;
}

export interface AnalyticsSummary {
  today_revenue: number;
  today_orders: number;
  total_products: number;
  low_stock_count: number;
  weekly_revenue: number;
  monthly_revenue: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface PaymentMethodStat {
  payment_method: string;
  count: number;
  total: number;
}

export interface ShiftPerformance {
  shift_name: string;
  total_revenue: number;
  total_orders: number;
}
