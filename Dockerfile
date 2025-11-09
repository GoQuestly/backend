FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx nest build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

RUN npm install ts-node tsconfig-paths typescript dotenv --save-dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/node_modules/ts-node ./node_modules/ts-node
COPY --from=builder /usr/src/app/node_modules/tsconfig-paths ./node_modules/tsconfig-paths
COPY --from=builder /usr/src/app/node_modules/cross-env ./node_modules/cross-env
COPY --from=builder /usr/src/app/node_modules/json5 ./node_modules/json5
COPY --from=builder /usr/src/app/node_modules/strip-bom ./node_modules/strip-bom
COPY --from=builder /usr/src/app/node_modules/@cspotcode/source-map-support ./node_modules/@cspotcode/source-map-support

EXPOSE 3000

CMD ["sh", "-c", "npm run migration:run:prod && node dist/main.js"]