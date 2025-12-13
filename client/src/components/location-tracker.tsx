import { useEffect } from "react";
import { useAuth } from "@/lib/auth"; // O tu hook de autenticación
import { useToast } from "@/hooks/use-toast"; // Si tienes notificaciones

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // 1. Solo activamos si el usuario es CONDUCTOR
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 2. Función que envía la ubicación al servidor
    const sendLocation = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        
        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lng: longitude }),
        });
        
      } catch (error) {
        console.error("Error enviando ubicación:", error);
      }
    };

    // 3. Activamos el rastreo (Esto pedirá permisos en el móvil)
    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        console.error("Error de GPS:", error);
        if (error.code === 1) {
          toast({
            variant: "destructive",
            title: "GPS Desactivado",
            description: "Por favor permite el acceso a la ubicación para trabajar.",
          });
        }
      },
      {
        enableHighAccuracy: true, // Modo alta precisión para autos
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    // Limpieza al salir
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, toast]);

  return null; // Este componente no renderiza nada visual
}s