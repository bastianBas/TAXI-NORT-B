FROM node:20-alpine

WORKDIR /app

# Copiamos package.json
COPY package.json ./

# Instalamos TODO (dependencies y devDependencies) para que el build funcione
RUN npm install

# Copiamos el código
COPY . .

# Construimos la web
RUN npm run build

# Exponemos puerto 8080
EXPOSE 8080

# Arrancamos
CMD ["npm", "run", "start"]