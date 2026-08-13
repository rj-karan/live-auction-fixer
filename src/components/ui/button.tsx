import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ripple inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-bold uppercase tracking-[0.1em] cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:opacity-85 hover:shadow-[0_0_16px_color-mix(in_oklab,var(--neon)_45%,transparent)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:shadow-[0_0_16px_color-mix(in_oklab,var(--destructive)_45%,transparent)]",
        outline:
          "border border-primary bg-transparent text-primary hover:bg-primary/10 hover:shadow-[0_0_14px_color-mix(in_oklab,var(--neon)_25%,transparent)]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "font-medium normal-case tracking-normal hover:bg-accent hover:text-accent-foreground",
        link: "font-medium normal-case tracking-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[4px] px-3 text-xs",
        lg: "h-10 rounded-[4px] px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
