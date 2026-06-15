// Re-export Prisma types for use across the API
export type {
  User, Role, Category, Product, ProductVariant,
  VariantIngredient, RawMaterial, IngredientLog,
  Bundle, BundleItem, Order, OrderDetail,
  OrderDetailVariant, Transaction,
  ProductStatus, ChangeType, OrderStatus,
  PaymentMethod, PaymentStatus,
} from '@prisma/client';
