import { useEffect, useRef } from "react";
// 🟢 CORRECCIÓN: Importamos desde tu ubicación real (lib/auth)
import { useAuth } from "@/lib/auth";

export function DriverGpsTracker() {
  const { user } = useAuth();
  
  // Usamos 'refs' para guardar la ubicación sin provocar renderizados visuales
  const latestLocation = useRef<{ lat: number; lng: number; speed: number } | null>(null);
  const lastSentTime = useRef<number>(0);

  useEffect(() => {
    // Si no es conductor, no hacemos nada
    if (!user || user.role !== 'driver') return;

    console.log("✅ GPS Iniciado: Modo Conductor");

    // 1. ESCUCHAR AL GPS DEL CELULAR (Se actualiza muy rápido)
    const geoId = navigator.geolocation.watchPosition(
      (position) => {
        // Guardamos la coordenada más reciente en memoria
        latestLocation.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // Convertir m/s a km/h
        };
      },
      (error) => {
        console.error("❌ Error obteniendo GPS:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    // 2. ENVIAR AL SERVIDOR (Controlado: Una vez cada 10 segundos)
    const intervalId = setInterval(async () => {
      // Si no tenemos ubicación aún, o si pasaron menos de 10 seg desde el último envío, esperamos.
      const now = Date.now();
      if (!latestLocation.current) return;
      if (now - lastSentTime.current < 10000) return; 

      try {
        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: latestLocation.current.lat,
            lng: latestLocation.current.lng,
            speed: latestLocation.current.speed,
            status: 'active'
          }),
        });
        
        // Actualizamos el reloj
        lastSentTime.current = now;
        console.log("📡 Ubicación enviada al servidor");
        
      } catch (err) {
        console.error("⚠️ Servidor ocupado o sin red, reintentando luego...");
      }
    }, 5000); // Revisamos cada 5s, pero el filtro de arriba asegura el envío cada 10s.

    // Limpieza al cerrar sesión o salir
    return () => {
      navigator.geolocation.clearWatch(geoId);
      clearInterval(intervalId);
    };
  }, [user]);

  // Este componente es invisible en la pantalla
  return null;
}