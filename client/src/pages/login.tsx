import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { User, Lock } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export default function Login() {
  const { loginMutation, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
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

      <Card className="w-full max-w-md shadow-2xl z-10 bg-zinc-900/90 border-yellow-500/50 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-8">
          
          {/* 🟢 LOGO ACTUALIZADO: logo-oficial.jpg */}
          <div className="mx-auto mb-4">
            <img 
              src="/uploads/logo-oficial.jpg" 
              alt="Logo Taxi Nort" 
              className="h-24 w-auto mx-auto rounded-lg object-contain shadow-lg border border-yellow-500/20"
            />
          </div>
          
          <CardTitle className="text-4xl font-black text-white tracking-tighter uppercase">
            TAXI<span className="text-yellow-500">-NORT</span>
          </CardTitle>
          <CardDescription className="text-yellow-500/80 font-medium tracking-widest text-xs uppercase">
            Servicio de Transporte Profesional
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Usuario / Correo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-yellow-500/70" />
                        <Input 
                          placeholder="conductor@taxinort.cl" 
                          {...field} 
                          className="pl-10 bg-zinc-950/50 border-zinc-700 text-white focus:border-yellow-500 focus:ring-yellow-500/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-400">Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-yellow-500/70" />
                        <Input 
                          type="password" 
                          placeholder="••••••" 
                          {...field} 
                          className="pl-10 bg-zinc-950/50 border-zinc-700 text-white focus:border-yellow-500 focus:ring-yellow-500/20"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg h-12 shadow-lg transition-all duration-200 uppercase tracking-wide" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Iniciando..." : "INICIAR SESIÓN"}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="justify-center border-t border-zinc-800 pt-6">
          <p className="text-sm text-zinc-500">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-yellow-500 hover:text-yellow-400 hover:underline font-semibold transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}