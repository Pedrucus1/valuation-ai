import * as React from "react";
import { cn } from "@/lib/utils";

// Input numérico con prefijo "$" y separador de miles en vivo — mismo contrato
// value/onChange (string numérico plano) que <Input type="number">, para no
// tener que tocar la lógica de cálculo que ya consume esos valores.
const formatThousands = (raw) => {
  if (!raw) return "";
  const [intPart, decPart] = String(raw).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
};

const MoneyInput = React.forwardRef(({ className, value, onChange, disabled, placeholder, ...props }, ref) => {
  const handleChange = (e) => {
    const clean = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    onChange?.({ ...e, target: { ...e.target, value: clean } });
  };

  return (
    <div className="relative">
      <span className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground", disabled && "opacity-50")}>$</span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={formatThousands(value)}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder ?? "0"}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent pl-6 pr-2 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    </div>
  );
});
MoneyInput.displayName = "MoneyInput";

export { MoneyInput };
