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
  role?: Role;
  createdAt?: string;
}

export interface Category {
  id: number;
  category_name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariantIngredient {
  id: number;
  variant_id: number;
  raw_material_id: number;
  quantity: number;
  RawMaterial?: Pick<RawMaterial, "id" | "material_name" | "unit" | "cost_per_unit">;
}

export interface ProductVariant {
  id: number;
  variant_name: string;
  price: number;
  overhead_cost: number;
  product_id: number;
  Product?: Pick<Product, "id" | "product_name">;
  VariantIngredients?: VariantIngredient[];
}

export interface Product {
  id: number;
  product_name: string;
  description?: string;
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
  variant_id?: number;
  quantity: number;
  Product?: Pick<Product, 'id' | 'product_name' | 'image_url'>;
  ProductVariant?: Pick<ProductVariant, 'id' | 'variant_name' | 'price' | 'overhead_cost' | 'VariantIngredients'>;
}

export interface Bundle {
  id: number;
  bundle_name: string;
  description?: string;
  image_url?: string;
  bundle_price: number;
  total_bundle_cost: number;
  bundle_profit: number;
  is_active: boolean;
  BundleItems?: BundleItem[];
  createdAt?: string;
}

export interface OrderDetailVariant {
  id: number;
  variant_id: number;
  ProductVariant?: Pick<ProductVariant, 'id' | 'variant_name' | 'price'>;
}

export interface OrderDetail {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  Product?: Pick<Product, 'id' | 'product_name'>;
  OrderDetailVariants?: OrderDetailVariant[];
  bundle_id?: number | null;
  bundle_name?: string | null;
  bundle_items_json?: string | null;
  Bundle?: Pick<Bundle, 'id' | 'bundle_name' | 'bundle_price'>;
}



export interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  order_status: "pending" | "completed" | "cancelled";
  notes?: string;
  user_id: number;
  createdAt: string;
  User?: Pick<User, "id" | "full_name" | "username">;
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
  User?: Pick<User, "id" | "full_name" | "username">;
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
