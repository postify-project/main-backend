# 1. Base Node.js image
FROM node:24-alpine

# 2. Container ke andar working directory set karein
WORKDIR /app

# 3. package.json aur package-lock.json copy karein
COPY package*.json ./

# 4. Dependencies install karein
RUN npm install

# 5. Baki poora source code copy karein
COPY . .

# 6. Port expose karein (Jiss port par aapka app chalta hai, e.g., 5000 ya 8080)
EXPOSE 5000

# 7. App start karne ki command
CMD ["node", "src/app.js"]