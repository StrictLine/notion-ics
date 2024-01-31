FROM node:lts-alpine
ENV NODE_ENV=development

ARG NOTION_TOKEN
ENV NOTION_TOKEN=${NOTION_TOKEN}}
ARG ACCESS_KEY
ENV ACCESS_KEY=${ACCESS_KEY}

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production --silent

COPY . .
RUN npm run build

RUN chown -R node /app
USER node

EXPOSE 5173
CMD ["npm", "start"]
