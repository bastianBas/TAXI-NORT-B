export const cleanRut = (rut: string): string => {
  return typeof rut === 'string' ? rut.replace(/[^0-9kK]+/g, '').toUpperCase() : '';
};

export const validateRut = (rut: string): boolean => {
  // 1. Limpiar el RUT (quitar puntos y guión)
  const clean = cleanRut(rut);
  
  // 2. Validar largo mínimo (Ej: 1.111-1 son 5 caracteres limpios mínimo)
  if (clean.length < 7) return false; // Bloquea números cortos al azar como "999"

  // 3. Separar Cuerpo y Dígito Verificador (DV)
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  
  // 4. Validar que el cuerpo sea numérico
  if (!/^[0-9]+$/.test(body)) return false;

  // 5. ALGORITMO MÓDULO 11
  let sum = 0;
  let multiplier = 2;

  // Recorrer el cuerpo de derecha a izquierda
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let calculatedDv = remainder.toString();

  if (remainder === 11) calculatedDv = "0";
  if (remainder === 10) calculatedDv = "K";

  // 6. Comparar
  return dv === calculatedDv;
};

// Formateador visual (12.345.678-K)
export const formatRut = (rut: string): string => {
  const clean = cleanRut(rut);
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  
  // Formato con puntos
  let formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${formattedBody}-${dv}`;
};