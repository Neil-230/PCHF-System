# Stage 1: Build the React application
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build the production bundle
COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy the built files from the build stage to Nginx's static file directory
COPY --from=build /app/dist /usr/share/nginx/html

# Replace the default Nginx configuration (optional, but recommended for SPAs)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for traffic
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
