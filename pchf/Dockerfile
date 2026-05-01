# Stage 1: Build the React application
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the production bundle
COPY . .
RUN npm run build

# Stage 2: Serve the application with Express
FROM node:20-alpine

WORKDIR /app

# Copy package.json for production dependencies
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev

# Copy the built files from the build stage
COPY --from=build /app/dist ./dist

# Copy the server script
COPY server.js ./

# Expose port 80 for traffic
EXPOSE 80

# Start the express server
CMD ["node", "server.js"]
