# At4All API Dockerfile
FROM node:20
# The port nginx expects the UI to be on
EXPOSE 4000
ENV NODE_ENV=production
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm i
# The following env vars are passed in for production env
# ENV SITE_URL='my_school_domain'
# ENV API_AUTHTOKEN
# ENV MONGO_USERNAME
# ENV MONGO_PASSWORD:
# ENV MONGODB_URI:
# ENV API_AUTHTOKEN,

CMD node index.js
