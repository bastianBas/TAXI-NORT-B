FROM node:20-alpine

WORKDIR /app

# Copiamos solo el package.json (ignoramos el lockfile antiguo por seguridad)
COPY package.json ./

# Instalamos las dependencias desde cero basándonos en el package.json actualizado
# Esto evita problemas si el package-lock.json local estaba desactualizado
RUN npm install

# Copiamos el resto del código
COPY . .

# Construimos la aplicación
RUN npm run build

# Exponemos el puerto 8080 (Estándar de Cloud Run)
EXPOSE 8080

# Comando de inicio
CMD ["npm", "run", "start"]