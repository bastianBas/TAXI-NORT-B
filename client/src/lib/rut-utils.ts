// Limpia el RUT dejando solo números y K
export const cleanRut = (rut: string): string => {
  return typeof rut === 'string' ? rut.replace(/[^0-9kK]+/g, '').toUpperCase() : '';
};

// Algoritmo Módulo 11 para validar
export const validateRut = (rut: string): boolean => {
  const clean = cleanRut(rut);
  
  // Validaciones básicas: largo mínimo y formato
  if (clean.length < 2) return false;
  
  // Separar cuerpo y dígito verificador
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  
  // Validar que el cuerpo sean solo números
  if (!/^[0-9]+$/.test(body)) return false;

  // Cálculo Módulo 11
  let sum = 0;
  let multiplier = 2;

  // Recorrer el cuerpo de atrás hacia adelante
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let calculatedDv = remainder.toString();

  if (remainder === 11) calculatedDv = "0";
  if (remainder === 10) calculatedDv = "K";

  return dv === calculatedDv;
};

// Formateador visual (12.345.678-K)
export const formatRut = (rut: string): string => {
  const clean = cleanRut(rut);
  
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  // Agregar puntos de miles
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formattedBody}-${dv}`;
};