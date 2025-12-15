// client/src/components/location-tracker.tsx

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Usamos un ref para evitar recrear la función en cada render
  const isOfflineSentRef = useRef(false);

  useEffect(() => {
    // 1. Solo activamos si el usuario es CONDUCTOR
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // Función auxiliar para enviar señal de desconexión inmediata
    const sendOfflineSignal = () => {
        // Evitamos enviar doble señal innecesariamente
        if (isOfflineSentRef.current) return;
        
        const data = JSON.stringify({ status: 'offline' });
        
        // Intentamos usar beacon (mejor para cierres de página)
        if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            const success = navigator.sendBeacon("/api/vehicle-locations", blob);
            if (success) isOfflineSentRef.current = true;
        } 
        
        // Si beacon falla o no existe, usamos fetch con keepalive
        if (!isOfflineSentRef.current) {
            fetch("/api/vehicle-locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
                keepalive: true 
            }).then(() => {
                isOfflineSentRef.current = true;
            }).catch(e => console.error("Error enviando offline:", e));
        }
    };

    // 2. Función que envía la ubicación al servidor (Aparición Inmediata)
    const sendLocation = async (position: GeolocationPosition) => {
      try {
        // Si volvemos a tener señal, reseteamos la bandera de offline
        isOfflineSentRef.current = false;

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

    // 3. Activamos el rastreo
    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        console.error("Error de GPS:", error);
        // SI HAY UN ERROR CRÍTICO (COMO APAGAR EL GPS), BORRAMOS EL AUTO
        if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
            sendOfflineSignal();
            toast({
                variant: "destructive",
                title: "GPS Desactivado o Sin Señal",
                description: "Tu vehículo se ha ocultado del mapa.",
            });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 // Forzamos a no usar caché para que sea "altiro"
      }
    );

    // LIMPIEZA: Al cerrar sesión o salir del componente
    return () => {
        navigator.geolocation.clearWatch(watchId);
        sendOfflineSignal(); // ¡Desaparición instantánea!
    };
  }, [user, toast]);

  return null;
}