FROM node:20-alpine

WORKDIR /app

# 1. Copiamos SOLO el package.json
COPY package.json ./

# 2. Instalación limpia (sin package-lock)
RUN npm install

# 3. Copiamos el resto del código
COPY . .

# 4. Construimos la aplicación
RUN npm run build

# 5. Exponemos el puerto 8080
EXPOSE 8080

# 6. Comando de inicio
CMD ["npm", "run", "start"]