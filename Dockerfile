# Usamos una imagen ligera de Node.js
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración primero para aprovechar caché
COPY package*.json ./

# Instalar todas las dependencias (incluyendo dev para construir)
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la aplicación (Frontend + Backend)
RUN npm run build

# Exponer el puerto
EXPOSE 5000

# Comando para iniciar
CMD ["npm", "run", "start"]