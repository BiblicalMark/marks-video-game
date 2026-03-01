# Use official Node LTS image
FROM node:20-slim

WORKDIR /app

# Copy package manifest
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
