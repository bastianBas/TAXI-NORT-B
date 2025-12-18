// src/lib/compressor.ts

export const compressImage = (file: File, quality = 0.7, maxWidth = 1200): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;

            // Redimensionar si es muy grande manteniendo la proporción
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("No se pudo obtener el contexto del canvas"));
                return;
            }

            ctx.drawImage(image, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Error al comprimir la imagen"));
                    return;
                }
                // Convertir el blob de vuelta a un archivo
                const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg', // Forzamos a JPEG para mejor compresión
                    lastModified: Date.now(),
                });
                resolve(compressedFile);
            }, 'image/jpeg', quality); // Calidad 0.7 (70%) reduce MUCHO el peso
        };

        image.onerror = (err) => reject(err);
    });
};