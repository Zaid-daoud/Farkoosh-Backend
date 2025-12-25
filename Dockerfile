FROM node:20-alpine

WORKDIR /app

# 1) Copy package files and install first
COPY package*.json ./
RUN npm ci

# 2) Copy Prisma schema *before generate*
COPY prisma ./prisma

# 3) Copy everything else
COPY . .

# 4) Generate Prisma client (must see schema)
RUN npx prisma generate

# 5) Build your project if TS
RUN npm run build

# 6) Start app
CMD ["npm", "run", "start"]
