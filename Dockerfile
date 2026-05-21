FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.js ./
COPY migrations ./migrations
COPY scripts ./scripts

ENV PORT=8080
EXPOSE 8080

# Default: keep the serverless app running (HTTP on 8080).
# Execution Commands in Boltic override this with your command.
CMD ["node", "index.js"]
