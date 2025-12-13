import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export function LocationTracker() {
  const { user } = useAuth();

  useEffect(() => {
    // Si no es conductor, no hacemos nada (ahorramos batería al admin)
    if (!user || user.role !== 'driver') return;

    // Función que envía los datos a nuestra nueva ruta
    const sendLocation = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      
      fetch("/api/vehicle-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latitude, lng: longitude }),
      }).catch(err => console.error("Error enviando GPS:", err));
    };

    // Activamos el sensor GPS del navegador
    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => console.error("Error obteniendo GPS:", err),
      {
        enableHighAccuracy: true, // Usar GPS real
        timeout: 10000,
        maximumAge: 5000 
      }
    );

    // Limpieza al cerrar sesión
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  return null; // Es invisible
}