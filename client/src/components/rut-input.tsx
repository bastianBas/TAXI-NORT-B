import React from "react";
import { Input } from "@/components/ui/input";
import { formatRut } from "@/lib/rut-utils";

interface RutInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onRutChange?: (formatted: string) => void;
}

export const RutInput = React.forwardRef<HTMLInputElement, RutInputProps>(
  ({ onChange, onRutChange, className, ...props }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // 1. Tomamos el valor crudo
      const rawValue = e.target.value;
      
      // 2. Lo formateamos
      const formatted = formatRut(rawValue);
      
      // 3. Limitamos el largo máximo (12 caracteres: 99.999.999-K)
      if (formatted.length > 12) return;

      // 4. Actualizamos el evento con el valor formateado
      e.target.value = formatted;
      
      // 5. Propagamos el cambio al formulario padre
      if (onChange) onChange(e);
      if (onRutChange) onRutChange(formatted);
    };

    return (
      <Input
        {...props}
        ref={ref}
        onChange={handleChange}
        placeholder="12.345.678-9"
        maxLength={12} // Prevención extra
        className={className}
      />
    );
  }
);

RutInput.displayName = "RutInput";