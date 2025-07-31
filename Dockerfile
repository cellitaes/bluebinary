FROM node:22-alpine

RUN apk add --no-cache su-exec

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

RUN mkdir -p /app/data/dev /app/data/prod /app/logs

CMD ["npm", "run", "start:prod"]