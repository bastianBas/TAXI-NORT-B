FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Instalar todas las dependencias
RUN npm install

COPY . .

# Construir la aplicación (Frontend y Backend)
RUN npm run build

# Exponemos el puerto 8080 como buena práctica para Cloud Run
# (Aunque tu app leerá la variable PORT automáticamente)
EXPOSE 8080

# Comando de inicio
CMD ["npm", "run", "start"]