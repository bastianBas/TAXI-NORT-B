import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // Solo activar si es un conductor
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 1. MANTENER PANTALLA ENCENDIDA (Wake Lock)
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

    // 2. FUNCIÓN PARA ENVIAR UBICACIÓN AL SERVIDOR
    const sendLocation = async (position: GeolocationPosition) => {
      try {
        isOfflineSentRef.current = false;
        const { latitude, longitude, speed } = position.coords;

        // Enviamos al servidor (sin await para no bloquear la UI)
        fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            speed: speed ? (speed * 3.6) : 0 // Convertir a km/h
          }),
        }).catch(e => console.error("Error envío silencioso:", e));

      } catch (error) { console.error("Error procesando ubicación:", error); }
    };

    // 3. SEÑAL DE APAGADO INSTANTÁNEO
    const sendOfflineSignal = () => {
      if (isOfflineSentRef.current) return;
      const data = JSON.stringify({ status: 'offline' });
      
      // sendBeacon es más rápido y seguro al cerrar la app
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

    // 🚀 4. INICIO INSTANTÁNEO (EL TRUCO "ALTIRO")
    // Pedimos ubicación de baja precisión o caché PRIMERO.
    // Esto responde en milisegundos usando antenas o memoria.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log("🚀 Ubicación rápida obtenida");
        sendLocation(pos);
      },
      (e) => console.log("Ubicación rápida no disponible, esperando satélite..."),
      { 
        enableHighAccuracy: false, // FALSE = Velocidad (Antenas/Wifi)
        timeout: 3000, 
        maximumAge: Infinity // Usa cualquier dato guardado reciente
      }
    );

    // 5. RASTREO CONSTANTE (ALTA PRECISIÓN)
    // Una vez que el GPS calienta, este toma el control con datos exactos.
    const watchId = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        if (error.code === error.PERMISSION_DENIED || error.code === error.POSITION_UNAVAILABLE) {
          sendOfflineSignal();
          toast({ variant: "destructive", title: "GPS Perdido", description: "Vehículo oculto." });
        }
      },
      { 
        enableHighAccuracy: true, // TRUE = Precisión (Satélite)
        timeout: 10000, 
        maximumAge: 0 
      }
    );

    // Limpieza al salir
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