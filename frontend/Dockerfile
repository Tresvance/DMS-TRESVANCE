FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install

# Copy project
COPY . .

# Set backend URL for Docker environment
ENV VITE_BACKEND_URL=http://backend:8000

# Expose port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
