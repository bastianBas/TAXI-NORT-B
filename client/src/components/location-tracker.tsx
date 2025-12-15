// client/src/components/location-tracker.tsx

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null); // Referencia para el Wake Lock

  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 🟢 FUNCIÓN PARA MANTENER LA PANTALLA ENCENDIDA (Wake Lock)
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('Pantalla mantenida activa (Wake Lock)');
            } catch (err) {
                console.error('No se pudo activar Wake Lock:', err);
            }
        }
    };

    // Activamos Wake Lock al iniciar
    requestWakeLock();

    // Re-activar si la página vuelve a ser visible (por si el usuario minimizó y volvió)
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && user.role === 'driver') {
            requestWakeLock();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);


    // --- LÓGICA DE DESCONEXIÓN Y ENVÍO DE DATOS (Igual que antes) ---

    const sendOfflineSignal = () => {
        if (isOfflineSentRef.current) return;
        
        const data = JSON.stringify({ status: 'offline' });
        
        if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            const success = navigator.sendBeacon("/api/vehicle-locations", blob);
            if (success) isOfflineSentRef.current = true;
        } 
        
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

    const sendLocation = async (position: GeolocationPosition) => {
      try {
        isOfflineSentRef.current = false;
        const { latitude, longitude, speed } = position.coords;
        
        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            lat: latitude, 
            lng: longitude,
            speed: speed 
          }),
        });
        
      } catch (error) {
        console.error("Error enviando ubicación:", error);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        console.error("Error de GPS:", error);
        if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
            sendOfflineSignal();
            toast({
                variant: "destructive",
                title: "GPS Desactivado",
                description: "Tu vehículo se ha ocultado del mapa.",
            });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 
      }
    );

    return () => {
        navigator.geolocation.clearWatch(watchId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        // Liberar Wake Lock
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(e => console.error(e));
            wakeLockRef.current = null;
        }

        sendOfflineSignal();
    };
  }, [user, toast]);

  return null;
}