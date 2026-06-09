# --- Backend API image ---
FROM node:20-alpine

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Application source.
COPY src ./src

# Local file storage (overridable; mount a volume in production).
RUN mkdir -p uploads
ENV NODE_ENV=production \
    PORT=5000 \
    UPLOAD_DIR=/app/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
