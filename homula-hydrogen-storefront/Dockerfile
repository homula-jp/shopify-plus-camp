# FROM node:20 AS build-env
FROM node:20

WORKDIR /app
COPY . .

# RUN yarn
# RUN yarn build
RUN npm install
RUN npx remix build

# FROM gcr.io/distroless/nodejs:16 AS run-env
# FROM node:16 AS run-env
ENV NODE_ENV production
# COPY --from=build-env /app /app

EXPOSE ${PORT:-3000}

WORKDIR /app
CMD ["npm", "run", "start"]
