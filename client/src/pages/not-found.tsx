import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Página No Encontrada</CardTitle>
          <CardDescription>
            La página que buscas no existe o no tienes permisos para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/" data-testid="link-go-home">
            <Button className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Volver al Inicio
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
