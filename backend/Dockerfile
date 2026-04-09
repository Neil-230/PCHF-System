# Use Node.js LTS as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the backend source code
COPY . .

# Expose the API port (adjust if your backend uses a different port)
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]
