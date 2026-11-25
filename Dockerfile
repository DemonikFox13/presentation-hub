FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

ENV PORT=8000
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data/uploads

EXPOSE 8000

CMD ["npm", "start"]
