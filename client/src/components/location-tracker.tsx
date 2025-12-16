import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // Solo activar si el usuario es conductor
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    // 🚀 1. INICIO INSTANTÁNEO (TRUCO DE MEMORIA)
    // Apenas carga el componente (al iniciar sesión), buscamos si hay una ubicación guardada
    // y la enviamos de inmediato al servidor.
    const savedLoc = localStorage.getItem("taxinort_last_pos");
    if (savedLoc) {
      try {
        const { lat, lng } = JSON.parse(savedLoc);
        console.log("📍 Enviando última ubicación conocida (Memoria Flash)");
        
        // Enviamos sin esperar respuesta para no bloquear nada
        fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat,
            lng,
            speed: 0, // Asumimos velocidad 0 al inicio
            status: 'active'
          }),
        }).catch(e => console.error("Error enviando caché:", e));
      } catch (e) {
        console.error("Error leyendo memoria local:", e);
      }
    }

    // 2. WAKE LOCK (Mantener pantalla encendida)
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

    // 3. FUNCIÓN DE ENVÍO NORMAL (GPS REAL)
    const sendLocation = async (position: GeolocationPosition) => {
      try {
        isOfflineSentRef.current = false;
        const { latitude, longitude, speed } = position.coords;

        // 💾 GUARDAR EN MEMORIA PARA LA PRÓXIMA VEZ
        localStorage.setItem("taxinort_last_pos", JSON.stringify({ lat: latitude, lng: longitude }));

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

    // 4. SEÑAL OFFLINE (Al salir)
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

    // 5. INTENTO RÁPIDO DE GPS (Por si no había memoria)
    navigator.geolocation.getCurrentPosition(
      sendLocation,
      (e) => console.log("Esperando satélites..."),
      { maximumAge: Infinity, timeout: 2000, enableHighAccuracy: false }
    );

    // 6. RASTREO CONSTANTE DE ALTA PRECISIÓN
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