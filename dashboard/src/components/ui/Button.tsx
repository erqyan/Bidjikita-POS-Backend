import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "ghost"
  | "outline"
  | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-sm",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
  ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
  success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9 p-0",
  "icon-sm": "h-7 w-7 p-0",
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      asChild = false,
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = (asChild ? Slot : "button") as React.ElementType;
    return (
      <Comp
        className={cn(
          base,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
