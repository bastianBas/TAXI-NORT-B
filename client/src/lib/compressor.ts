export const compressImage = (file: File, quality = 0.4, maxWidth = 600): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;

            // Reducimos drásticamente el tamaño para móviles
            // 600px es suficiente para leer un recibo/voucher
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Error al procesar imagen"));
                return;
            }

            // Dibujamos la imagen redimensionada
            ctx.drawImage(image, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Error al comprimir"));
                    return;
                }
                // Convertimos a JPG ligero
                const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                
                // Log para verificar en consola (opcional)
                console.log(`Imagen comprimida a: ${(compressedFile.size / 1024).toFixed(2)} KB`);
                
                resolve(compressedFile);
            }, 'image/jpeg', quality); // Calidad 0.4 (baja pero legible)
        };
        image.onerror = (err) => reject(err);
    });
};