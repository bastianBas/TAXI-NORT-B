import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth"; 
import { useToast } from "@/hooks/use-toast";

export function DriverGpsTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // REFERENCIAS (Memoria RAM)
  const latestLocation = useRef<{ lat: number; lng: number; speed: number } | null>(null);
  const lastSentTime = useRef<number>(0);
  const isOfflineSentRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    // 1. VALIDACIONES
    if (!user || user.role !== 'driver') return;
    if (!('geolocation' in navigator)) {
      console.error("Tu dispositivo no soporta GPS");
      return;
    }

    console.log("🚀 Motor GPS Iniciado (Modo Optimizado)");

    // 2. INICIO INSTANTÁNEO
    const savedLoc = localStorage.getItem("taxinort_last_pos");
    if (savedLoc) {
      try {
        const { lat, lng } = JSON.parse(savedLoc);
        fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, speed: 0, status: 'active' }),
        }).catch(e => console.error("Error envío flash:", e));
      } catch (e) { console.error("Error memoria local:", e); }
    }

    // 3. WAKE LOCK (Pantalla Encendida)
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) { console.warn(err); }
      }
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    });

    // 4. CAPTURA DE GPS (Solo guarda en RAM)
    const geoId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        latestLocation.current = {
          lat: latitude,
          lng: longitude,
          speed: speed ? (speed * 3.6) : 0 
        };
        localStorage.setItem("taxinort_last_pos", JSON.stringify({ lat: latitude, lng: longitude }));
        isOfflineSentRef.current = false;
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
           toast({ variant: "destructive", title: "GPS Denegado", description: "Activa el GPS." });
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    // 5. ENVÍO CONTROLADO (Cada 10 segundos máximo)
    const intervalId = setInterval(async () => {
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
        lastSentTime.current = now;
      } catch (err) {
        console.error("⚠️ Servidor ocupado, reintentando...", err);
      }
    }, 5000); 

    // 6. SEÑAL OFF
    const sendOfflineSignal = () => {
      if (isOfflineSentRef.current) return;
      const data = JSON.stringify({ status: 'offline', lat: 0, lng: 0, speed: 0 });
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon("/api/vehicle-locations", blob);
      } else {
        fetch("/api/vehicle-locations", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: data, keepalive: true
        }).catch(console.error);
      }
      isOfflineSentRef.current = true;
    };

    window.addEventListener('beforeunload', sendOfflineSignal);

    return () => {
      navigator.geolocation.clearWatch(geoId);
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', sendOfflineSignal);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
      sendOfflineSignal();
    };
  }, [user, toast]);

  return null;
}