import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 🟢 MANTENER PANTALLA ENCENDIDA (Evita que el navegador corte el GPS por inactividad)
    const requestWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('Wake Lock activo: Pantalla no se apagará sola.');
            } catch (err) {
                console.warn('Wake Lock no disponible o denegado:', err);
            }
        }
    };

    // Solicitar Wake Lock al montar y al volver a ver la app
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && user.role === 'driver') {
            requestWakeLock();
        }
    });

    const sendOfflineSignal = () => {
        if (isOfflineSentRef.current) return;
        
        const data = JSON.stringify({ status: 'offline' });
        
        // Intentamos beacon para máxima fiabilidad al cerrar
        if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon("/api/vehicle-locations", blob);
            isOfflineSentRef.current = true;
        } else {
            fetch("/api/vehicle-locations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
                keepalive: true 
            }).then(() => {
                isOfflineSentRef.current = true;
            }).catch(e => console.error(e));
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
        // Si el usuario apaga el GPS manualmente, mandamos offline
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

    // Evento extra para capturar cierre de pestaña
    window.addEventListener('beforeunload', sendOfflineSignal);

    return () => {
        navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('beforeunload', sendOfflineSignal);
        
        if (wakeLockRef.current) {
            wakeLockRef.current.release().catch(() => {});
            wakeLockRef.current = null;
        }

        sendOfflineSignal();
    };
  }, [user, toast]);

  return null;
}