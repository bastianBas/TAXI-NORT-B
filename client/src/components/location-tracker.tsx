import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<any>(null); // Tipo any para evitar error de TS si no reconoce WakeLockSentinel

  useEffect(() => {
    // Solo activar para conductores
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 🟢 1. WAKE LOCK: Mantiene la pantalla encendida
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('⚡ Pantalla mantenida activa para GPS');
        } catch (err) {
          console.warn('Wake Lock no disponible:', err);
        }
      }
    };

    requestWakeLock();
    
    // Re-activar bloqueo si el usuario vuelve a la app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user.role === 'driver') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 🟢 2. ENVÍO DE SEÑAL DE DESCONEXIÓN (OFFLINE)
    const sendOfflineSignal = () => {
      if (isOfflineSentRef.current) return;
      
      const data = JSON.stringify({ status: 'offline' });
      
      // sendBeacon es mejor para cuando se cierra la página
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon("/api/vehicle-locations", blob);
        isOfflineSentRef.current = true;
      } else {
        // Fallback
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

    // 🟢 3. RASTREO GPS
    const sendLocation = async (position: GeolocationPosition) => {
      try {
        // Resetear bandera offline si estamos enviando datos
        isOfflineSentRef.current = false;
        
        const { latitude, longitude, speed } = position.coords;

        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            speed: speed ? (speed * 3.6) : 0 // m/s a km/h
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
        // Si se deniega permiso o no hay señal, asumimos offline
        if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
          sendOfflineSignal();
          toast({
            variant: "destructive",
            title: "GPS Perdido",
            description: "Tu vehículo no es visible en el mapa.",
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Evento si cierran la pestaña
    window.addEventListener('beforeunload', sendOfflineSignal);

    // Limpieza
    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('beforeunload', sendOfflineSignal);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      
      // Intentar enviar desconexión al desmontar
      sendOfflineSignal();
    };
  }, [user, toast]);

  return null;
}