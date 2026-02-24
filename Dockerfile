# Use Node.js LTS
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build TypeScript
RUN npm run build

# Create directory for auth credentials
RUN mkdir -p auth_info_baileys

# Start command
CMD [ "npm", "start" ]
