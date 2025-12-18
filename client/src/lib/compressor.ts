export const compressImage = (file: File, quality = 0.5, maxWidth = 800): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;

            // Reducimos a 800px de ancho máximo (suficiente para celulares y más ligero)
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
                // Convertimos el blob a un archivo JPG ligero
                const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                resolve(compressedFile);
            }, 'image/jpeg', quality); // Calidad 0.5 (50%)
        };
        image.onerror = (err) => reject(err);
    });
};