FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads logs
EXPOSE 5000
CMD ["node", "src/server.js"]
