import React from "react";
import { Input } from "@/components/ui/input";
import { formatPlate } from "@/lib/format-utils";

interface PlateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PlateInput = React.forwardRef<HTMLInputElement, PlateInputProps>(
  ({ onChange, className, ...props }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Formateamos el valor automáticamente
      const formatted = formatPlate(e.target.value);
      e.target.value = formatted;
      
      // Enviamos el evento modificado al formulario
      if (onChange) onChange(e);
    };

    return (
      <Input
        {...props}
        ref={ref}
        onChange={handleChange}
        maxLength={8} // 6 letras + 2 guiones
        className={`${className} font-mono uppercase placeholder:normal-case`} // Fuente monoespaciada para que parezca patente
      />
    );
  }
);

PlateInput.displayName = "PlateInput";