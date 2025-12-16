import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequestJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Signal, SignalHigh, SignalLow, SignalZero } from "lucide-react";

export function LocationTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Estados: idle (inactivo), searching (buscando señal), active (enviando), error
  const [status, setStatus] = useState<"idle" | "searching" | "active" | "error">("idle");
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<any>(null);

  // Solo activar si el usuario es un conductor
  if (!user || user.role !== "driver") return null;

  useEffect(() => {
    // --- 1. FUNCIÓN PARA MANTENER PANTALLA ENCENDIDA (WAKE LOCK) ---
    // Esto evita que el celular "duerma" la app y corte el GPS
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
          console.log("⚡ Pantalla mantenida activa para GPS");
        }
      } catch (err) {
        console.error("No se pudo activar Wake Lock:", err);
      }
    };

    // Pedir bloqueo al iniciar y al volver a la app
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    });

    // --- 2. INICIAR RASTREO GPS ---
    const startTracking = () => {
      setStatus("searching");

      if (!("geolocation" in navigator)) {
        setStatus("error");
        toast({ title: "Error GPS", description: "Tu navegador no soporta GPS.", variant: "destructive" });
        return;
      }

      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          // ÉXITO: Tenemos ubicación
          setStatus("active");
          const { latitude, longitude, speed, heading } = position.coords;

          try {
            // Enviar al servidor
            await apiRequestJson("/api/vehicle-locations", "POST", {
              lat: latitude,
              lng: longitude,
              speed: speed ? (speed * 3.6) : 0, // Convertir m/s a km/h
              heading: heading || 0,
              status: 'active'
            });
          } catch (e) {
            console.error("Error enviando ubicación:", e);
            // No cambiamos a error visualmente para no asustar al chofer por un fallo de red puntual
          }
        },
        (error) => {
          // ERROR: Perdimos señal o permisos
          console.error("Error GPS:", error);
          setStatus("error");
          // Reintentar automáticamente en 5 segundos
          setTimeout(startTracking, 5000);
        },
        {
          // OPCIONES CRÍTICAS PARA QUE NO SE CORTE
          enableHighAccuracy: true, // Usar satélite real
          timeout: 20000,           // Esperar hasta 20s antes de dar error
          maximumAge: 0             // No usar caché vieja, siempre ubicación real
        }
      );
    };

    startTracking();

    // Limpieza al salir
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (wakeLock.current) wakeLock.current.release();
    };
  }, []);

  // --- INDICADOR VISUAL PARA EL CHOFER (Esquina inferior izquierda) ---
  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md border
        ${status === 'active' ? 'bg-black/80 text-green-400 border-green-500/30' : ''}
        ${status === 'searching' ? 'bg-black/80 text-yellow-400 border-yellow-500/30' : ''}
        ${status === 'error' ? 'bg-red-900/90 text-white border-red-500' : ''}
      `}>
        {status === 'searching' && <><SignalLow className="h-3 w-3 animate-pulse" /> <span>Buscando satélites...</span></>}
        {status === 'active' && <><SignalHigh className="h-3 w-3" /> <span>GPS Activo • App Abierta</span></>}
        {status === 'error' && <><SignalZero className="h-3 w-3" /> <span>Sin señal GPS</span></>}
      </div>
    </div>
  );
}