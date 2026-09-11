import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

// Lista de conceptos libres (label + monto) con botón "+" — usada en deudas
// imprevistas, remodelación libre y gastos de gestión.
export default function DynamicMoneyList({ items, onChange, addLabel = "Agregar", emptyHint }) {
  const add = () => onChange([...items, { id: Date.now() + Math.random(), label: "", monto: "" }]);
  const setField = (id, field) => (e) =>
    onChange(items.map((it) => (it.id === id ? { ...it, [field]: e.target.value } : it)));
  const remove = (id) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && emptyHint && <p className="text-xs text-slate-400">{emptyHint}</p>}
      {items.map((it) => (
        <div key={it.id} className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">Concepto</Label>
            <Input value={it.label} onChange={setField(it.id, "label")} placeholder="Ej. gestoría" />
          </div>
          <div className="w-28">
            <Label className="text-xs">Monto</Label>
            <MoneyInput value={it.monto} onChange={setField(it.id, "monto")} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove(it.id)}><X className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="w-3.5 h-3.5 mr-1" /> {addLabel}
      </Button>
    </div>
  );
}
