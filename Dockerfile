FROM node:12-slim AS base
WORKDIR /app
COPY package.json yarn.lock ./

FROM base AS builder
RUN yarn install
COPY .eslintignore .eslintrc.js .prettierrc babel.config.js cli.js index.js tsconfig.json index.js ./
COPY src src
RUN yarn build

FROM base
ENV NODE_ENV=production
RUN yarn install
COPY --from=builder /app/dist dist
ENTRYPOINT [ "node" ]
CMD [ "dist/run_server.js" ]
