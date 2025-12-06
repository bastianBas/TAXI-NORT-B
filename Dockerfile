FROM node:20-alpine

WORKDIR /app

# Copiar package.json primero para aprovechar caché
COPY package.json ./

# Instalar TODO
RUN npm install

# Copiar código
COPY . .

# Construir
RUN npm run build

# Exponer puerto 8080
EXPOSE 8080

# Iniciar
CMD ["npm", "run", "start"]