import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary group-[.toaster]:rounded-lg group-[.toaster]:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]",
          title: "group-[.toast]:font-bold group-[.toast]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:border-l-destructive",
          success: "group-[.toaster]:border-l-primary",
          warning: "group-[.toaster]:border-l-gold",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
