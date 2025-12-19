import React from "react";
import { Input } from "@/components/ui/input";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onPhoneChange?: (formatted: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ onChange, onPhoneChange, className, value, ...props }, ref) => {
    
    // Función que maneja la lógica de "+56 9"
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let rawValue = e.target.value;

      // 1. Eliminar todo lo que NO sea número
      const numbersOnly = rawValue.replace(/\D/g, "");

      // 2. Si el usuario borra todo, reseteamos a la base 569
      // El "569" son los primeros 3 dígitos obligatorios
      let cleanNumber = numbersOnly;
      
      if (!cleanNumber.startsWith("569")) {
         // Si intentó borrar el prefijo, forzamos que empiece con 569
         // Recuperamos lo que escribió después del prefijo si es necesario
         cleanNumber = "569" + numbersOnly.replace(/^56/, "").replace(/^9/, ""); 
      }

      // 3. Limitar largo máximo (56 9 1234 5678 = 11 dígitos numéricos)
      if (cleanNumber.length > 11) {
        cleanNumber = cleanNumber.slice(0, 11);
      }

      // 4. Formatear visualmente: +56 9 XXXX XXXX
      // Parte 1: +56 9
      let formatted = "+56 9";
      
      // Parte 2: El resto de los números (quitamos el 569 inicial para procesar el resto)
      const rest = cleanNumber.slice(3);

      if (rest.length > 0) {
        formatted += " " + rest.slice(0, 4);
      }
      if (rest.length > 4) {
        formatted += " " + rest.slice(4);
      }

      // 5. Actualizar el valor en el evento
      e.target.value = formatted;
      
      if (onChange) onChange(e);
      if (onPhoneChange) onPhoneChange(formatted);
    };

    return (
      <Input
        {...props}
        ref={ref}
        // Si no hay valor, mostramos el prefijo por defecto
        defaultValue="+56 9 " 
        onChange={handleChange}
        placeholder="+56 9 1234 5678"
        className={className}
        maxLength={16} // +56 9 1234 5678 (16 caracteres con espacios)
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";