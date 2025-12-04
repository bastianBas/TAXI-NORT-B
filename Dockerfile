FROM node:20-alpine

WORKDIR /app

# 1. Copiamos SOLO package.json para instalar dependencias limpias
COPY package.json ./

# 2. Instalamos TODAS las dependencias (incluyendo dev para el build)
# --production=false es vital para que instale vite, esbuild, etc.
RUN npm install --production=false

# 3. Copiamos el resto del código
COPY . .

# 4. Construimos la aplicación
RUN npm run build

# 5. Limpieza opcional (comentada por seguridad ahora mismo)
# RUN npm prune --production

# 6. Exponemos el puerto 8080 explícitamente
EXPOSE 8080

# 7. Comando de inicio
# Usamos 'exec' para que las señales de apagado lleguen bien a Node
CMD ["npm", "run", "start"]