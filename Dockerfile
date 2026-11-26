# ============================================================================
#  GrowInch Inventory — single-image build
#  Stage 1 builds the React client; stage 2 runs the Node API which also
#  serves the built client, so the whole app is ONE container on ONE port.
# ============================================================================

# ---- Stage 1: build the React client ----
FROM node:20-alpine AS client
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Relative '/api' is the default, so no API URL baked in — works on any host.
RUN npm run build

# ---- Stage 2: backend runtime ----
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# Place the built client where the server expects it (../frontend/dist).
COPY --from=client /app/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV SERVE_CLIENT=true
ENV PORT=5001
EXPOSE 5001

CMD ["node", "src/index.js"]
