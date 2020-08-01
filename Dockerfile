FROM node:12-slim AS base
WORKDIR /app
COPY package.json yarn.lock ./

FROM base AS builder
RUN yarn install
COPY tsconfig.json ./
COPY src src
RUN yarn build

FROM base
ENV NODE_ENV=production
RUN yarn install
COPY --from=builder /app/dist dist
ENTRYPOINT [ "node" ]
CMD [ "dist/run_server.js" ]
