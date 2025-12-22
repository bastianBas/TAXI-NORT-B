import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Car } from "lucide-react";

import { validateRut } from "@/lib/rut-utils";
import { toTitleCase } from "@/lib/format-utils";
import { RutInput } from "@/components/rut-input";
import { PhoneInput } from "@/components/phone-input";

const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().min(1, "El email es obligatorio").email("Email inválido"),
  
  rut: z.string()
    .min(1, "El RUT es obligatorio")
    .refine((val) => validateRut(val), {
      message: "RUT inválido (El dígito verificador no coincide)",
    }),

  phone: z.string()
    .min(15, "El teléfono debe tener 8 dígitos (+56 9 XXXX XXXX)"),

  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme la contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { registerMutation } = useAuth();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      rut: "",
      phone: "+56 9 ",
      password: "",
      confirmPassword: "",
    },
  });

  // Lógica: RUT -> Contraseña
  const rutValue = form.watch("rut");

  useEffect(() => {
    if (rutValue) {
      // 1. Limpiar RUT: quitar puntos y guiones (ej: 21.087.819-k -> 21087819k)
      const clean = rutValue.replace(/\./g, "").replace(/-/g, "");
      
      // 2. Si tiene longitud suficiente para tener cuerpo + DV
      if (clean.length > 1) {
        // 3. Obtener solo el cuerpo (sin el último caracter/DV)
        // ej: 21087819k -> 21087819
        const pass = clean.slice(0, -1);
        
        // 4. Asignar automáticamente a los campos ocultos
        form.setValue("password", pass, { shouldValidate: true });
        form.setValue("confirmPassword", pass, { shouldValidate: true });
      }
    }
  }, [rutValue, form]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-slate-900 rounded-full">
              <Car className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
          <CardDescription>
            Regístrate para unirte a la flota de Taxi Nort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Juan Pérez" 
                        {...field} 
                        onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="juan@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 gap-4"> 
              {/* Cambiado a 1 columna para que el RUT tenga espacio para el texto largo */}
                <FormField
                    control={form.control}
                    name="rut"
                    render={({ field }) => (
                    <FormItem>
                        {/* 🟢 ETIQUETA MODIFICADA CON AVISO DE CONTRASEÑA */}
                        <FormLabel>RUT (Se usará como contraseña sin dígito verificador) *</FormLabel>
                        <FormControl>
                        <RutInput placeholder="12.345.678-9" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono *</FormLabel>
                        <FormControl>
                        <PhoneInput {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

              {/* 🟢 CAMPOS OCULTOS PARA CONTRASEÑA (Necesarios para el envío del formulario) */}
              <input type="hidden" {...form.register("password")} />
              <input type="hidden" {...form.register("confirmPassword")} />

              <Button
                type="submit"
                className="w-full bg-slate-900 text-white hover:bg-slate-800"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Registrando..." : "Crear Cuenta"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}