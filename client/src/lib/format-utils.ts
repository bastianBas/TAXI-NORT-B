// Convierte "juan perez" -> "Juan Perez" (Capitalizar cada palabra)
export const toTitleCase = (str: string) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Formatea Patente: "bhffgf" -> "BH-FF-GF"
export const formatPlate = (value: string) => {
  // 1. Dejar solo letras y números, y convertir a mayúsculas
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  
  // 2. Limitar a 6 caracteres
  const trimmed = clean.slice(0, 6);

  // 3. Agrupar de a 2 caracteres y unir con guión
  // Esto convierte "BHFFGF" en ["BH", "FF", "GF"] y luego "BH-FF-GF"
  const chunks = trimmed.match(/.{1,2}/g);
  
  return chunks ? chunks.join("-") : trimmed;
};