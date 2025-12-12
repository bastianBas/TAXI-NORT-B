import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // 1. Al cargar, revisar si hay preferencia guardada o preferencia de sistema
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    // Aplicar la clase 'dark' al HTML
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Guardar preferencia
    localStorage.setItem("theme", newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary transition-colors"
      title={theme === "light" ? "Activar Modo Oscuro" : "Activar Modo Claro"}
    >
      {theme === "light" ? (
        // Icono de Luna (para ir a oscuro)
        <Moon className="h-4 w-4 transition-all" />
      ) : (
        // Icono de Sol (para ir a claro)
        <Sun className="h-4 w-4 transition-all" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}