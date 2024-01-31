FROM node:lts-alpine
ENV NODE_ENV=development

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production --silent

COPY . .
RUN npm run build

RUN chown -R node /app
USER node

EXPOSE 5173
CMD ["npm", "start"]
