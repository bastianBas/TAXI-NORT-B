import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function DriverGpsTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // REFERENCIAS
  const latestLocation = useRef<{ lat: number; lng: number; speed: number } | null>(null);
  const lastSentTime = useRef<number>(0);
  const isOfflineSentRef = useRef(false);
  const hasSentFirstLocation = useRef(false); // 🚀 NUEVO: Para enviar el primero al instante
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    if (!('geolocation' in navigator)) {
      console.error("GPS no soportado");
      return;
    }

    console.log("🚀 Motor GPS: Listo para arranque inmediato");

    // 1. WAKE LOCK (Pantalla Encendida)
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

    // 2. FUNCIÓN DE ENVÍO DIRECTO
    const sendData = async (status: 'active' | 'offline' = 'active') => {
      if (!latestLocation.current && status === 'active') return;

      const body = {
        lat: latestLocation.current?.lat || 0,
        lng: latestLocation.current?.lng || 0,
        speed: latestLocation.current?.speed || 0,
        status: status
      };

      try {
        await fetch("/api/vehicle-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        lastSentTime.current = Date.now();
        // console.log(`📡 Enviado: ${status}`);
      } catch (err) {
        console.error("Error envío:", err);
      }
    };

    // 3. CAPTURA DE GPS
    const geoId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        
        latestLocation.current = {
          lat: latitude,
          lng: longitude,
          speed: speed ? (speed * 3.6) : 0 
        };

        // 🚀 LÓGICA DE "ALTIRO":
        // Si es la primera vez que recibimos señal, enviamos INMEDIATAMENTE.
        // No esperamos al intervalo de 10s.
        if (!hasSentFirstLocation.current) {
          console.log("📍 Primera ubicación detectada: Enviando ALTIRO.");
          sendData('active');
          hasSentFirstLocation.current = true;
        }

        isOfflineSentRef.current = false;
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
           toast({ variant: "destructive", title: "GPS", description: "Es necesario activar el GPS." });
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    // 4. INTERVALO DE MANTENIMIENTO (Cada 10s)
    // Mantiene la conexión viva y actualiza la posición suavemente
    const intervalId = setInterval(() => {
      const now = Date.now();
      // Solo enviamos si pasaron 10 segundos desde el último envío
      if (now - lastSentTime.current >= 10000) {
        sendData('active');
      }
    }, 2000); // Revisamos cada 2s, pero el 'if' respeta los 10s

    // 5. SALIDA INMEDIATA (Al cerrar pestaña)
    const sendOfflineSignal = () => {
      if (isOfflineSentRef.current) return;
      
      const data = JSON.stringify({ status: 'offline', lat: 0, lng: 0, speed: 0 });
      const blob = new Blob([data], { type: 'application/json' });
      
      if (navigator.sendBeacon) {
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