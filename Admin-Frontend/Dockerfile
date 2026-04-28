FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["sh", "-lc", "DISABLE_ESLINT_PLUGIN=true HOST=0.0.0.0 PORT=3000 npm start"]