import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 1. WAKE LOCK (Pantalla siempre activa)
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log("⚡ Pantalla activa para GPS");
        } catch (err) { console.warn(err); }
      }
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    });

    // 2. FUNCIÓN DE ENVÍO
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
            speed: speed ? (speed * 3.6) : 0
          }),
        });
      } catch (error) { console.error("Error envío GPS:", error); }
    };

    // 3. SEÑAL OFFLINE (Para borrar del mapa)
    const sendOfflineSignal = () => {
      if (isOfflineSentRef.current) return;
      const data = JSON.stringify({ status: 'offline' });
      
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon("/api/vehicle-locations", blob);
        isOfflineSentRef.current = true;
      } else {
        fetch("/api/vehicle-locations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: data, keepalive: true
        }).then(() => isOfflineSentRef.current = true).catch(console.error);
      }
    };

    // 🚀 TRUCO VELOCIDAD: Obtener ubicación caché inmediatamente
    // Esto hace que el ícono aparezca "altiro" sin esperar satélites frescos
    navigator.geolocation.getCurrentPosition(
      sendLocation,
      (e) => console.log("Esperando satélites..."),
      { maximumAge: Infinity, timeout: 2000, enableHighAccuracy: false }
    );

    // 4. RASTREO CONSTANTE (Alta precisión)
    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
          sendOfflineSignal();
          toast({ variant: "destructive", title: "GPS Perdido", description: "Vehículo oculto." });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    window.addEventListener('beforeunload', sendOfflineSignal);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('beforeunload', sendOfflineSignal);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      sendOfflineSignal();
    };
  }, [user, toast]);

  return null;
}