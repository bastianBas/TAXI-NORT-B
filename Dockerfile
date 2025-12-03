FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies including devDependencies (needed for build tools like esbuild/vite)
# We ensure NODE_ENV is NOT set to production here to force full install
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (Frontend and Backend)
RUN npm run build

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start"]