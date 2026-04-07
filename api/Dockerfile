FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY dist/ ./dist/

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
