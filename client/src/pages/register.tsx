import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { z } from "zod";
import { Link } from "wouter";
import { User, Mail, IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { validateRut } from "@/lib/rut-utils";
import { toTitleCase } from "@/lib/format-utils";
import { RutInput } from "@/components/rut-input";
import { PhoneInput } from "@/components/phone-input";

// --- VALIDACIONES ---
const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().min(1, "El email es obligatorio").email("Email inválido"),
  
  rut: z.string()
    .min(1, "El RUT es obligatorio")
    .refine((val) => validateRut(val), {
      message: "RUT inválido (DV incorrecto)",
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

  // --- LÓGICA AUTOMÁTICA (RUT -> PASSWORD) ---
  const rutValue = form.watch("rut");

  useEffect(() => {
    if (rutValue) {
      const clean = rutValue.replace(/\./g, "").replace(/-/g, "");
      if (clean.length > 1) {
        const pass = clean.slice(0, -1);
        form.setValue("password", pass, { shouldValidate: true });
        form.setValue("confirmPassword", pass, { shouldValidate: true });
      }
    }
  }, [rutValue, form]);

  const inputIconClass = "absolute left-3 top-3 h-5 w-5 text-yellow-500/70 z-10";
  const inputFieldClass = "pl-10 bg-zinc-950/50 border-zinc-700 text-white focus:border-yellow-500 focus:ring-yellow-500/20";
  const phoneFieldClass = "bg-zinc-950/50 border-zinc-700 text-white focus-within:border-yellow-500 focus-within:ring-yellow-500/20";

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden py-10">
      {/* Fondo decorativo */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)'
        }}
      />
      
      {/* Franjas decorativas */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(45deg,#FDB813,#FDB813_20px,#000_20px,#000_40px)] z-10 opacity-80"></div>
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-[repeating-linear-gradient(45deg,#FDB813,#FDB813_20px,#000_20px,#000_40px)] z-10 opacity-80"></div>

      <Card className="w-full max-w-lg shadow-2xl z-10 bg-zinc-900/90 border-yellow-500/50 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-6">
          
          {/* 🟢 LOGO ACTUALIZADO: logo-oficial.jpg */}
          <div className="mx-auto mb-4">
             <img 
               src="/uploads/logo-oficial.jpg" 
               alt="Logo Taxi Nort" 
               className="h-24 w-auto mx-auto rounded-lg object-contain shadow-lg border border-yellow-500/20"
             />
          </div>

          <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase">
            Crear <span className="text-yellow-500">Cuenta</span>
          </CardTitle>
          <CardDescription className="text-yellow-500/80 font-medium tracking-widest text-xs uppercase">
            Únete a la flota Taxi Nort
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Nombre Completo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className={inputIconClass} />
                        <Input 
                          placeholder="Juan Pérez" 
                          {...field} 
                          onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                          className={inputFieldClass}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Correo Electrónico</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className={inputIconClass} />
                        <Input 
                          type="email"
                          placeholder="juan@ejemplo.com"
                          {...field}
                          className={inputFieldClass}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="rut"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-zinc-400">RUT (Será tu Clave)</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <IdCard className={inputIconClass} />
                                <RutInput 
                                    placeholder="12.345.678-9" 
                                    {...field} 
                                    className={inputFieldClass}
                                />
                            </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-zinc-400">Teléfono</FormLabel>
                        <FormControl>
                            <div className={phoneFieldClass + " rounded-md flex items-center"}>
                                <PhoneInput {...field} className="border-0 bg-transparent text-white placeholder:text-zinc-500 focus-visible:ring-0" />
                            </div>
                        </FormControl>
                        <FormMessage className="text-red-400" />
                    </FormItem>
                    )}
                />
              </div>

              <input type="hidden" {...form.register("password")} />
              <input type="hidden" {...form.register("confirmPassword")} />
              
              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg h-12 shadow-lg transition-all duration-200 uppercase tracking-wide mt-4" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Registrando..." : "REGISTRARSE"}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="justify-center border-t border-zinc-800 pt-6">
          <p className="text-sm text-zinc-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-yellow-500 hover:text-yellow-400 hover:underline font-semibold transition-colors">
              Inicia sesión aquí
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}