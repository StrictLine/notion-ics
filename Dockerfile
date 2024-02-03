FROM node:lts-alpine
ENV NODE_ENV=development
ARG BASE_PATH
ENV BASE_PATH=${BASE_PATH}

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production --silent

COPY . .
RUN npm run build

RUN chown -R node /app
USER node

EXPOSE 5173
CMD ["npm", "run", "preview"]
