import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
}: Readonly<{
  className?: string;
  orientation?: "horizontal" | "vertical";
}>) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        "border-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}

export { Separator };
