FROM node:20-alpine

WORKDIR /app

#only copying the dependencies which change rarely
COPY package*.json ./
RUN npm ci

#copy the whole server content in current app folder
COPY . .

EXPOSE 5000

CMD ["node","server.js"]
