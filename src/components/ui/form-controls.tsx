import { cn } from "@/lib/utils";

function Input({
  className,
  ...props
}: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-sm tabular-nums shadow-xs transition-[border-color,box-shadow,background-color] duration-150",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

function Label({
  className,
  htmlFor,
  children,
  ...props
}: Readonly<React.LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium leading-none text-foreground select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export { Label };

function Textarea({
  className,
  ...props
}: Readonly<React.TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-[80px] w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-150",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

function Select({
  className,
  ...props
}: Readonly<React.SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-sm shadow-xs transition-[border-color,box-shadow,background-color] duration-150",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
