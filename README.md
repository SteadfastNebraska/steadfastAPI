# Speedtest api

SpeedTest Api for steadfastnebraska.org based on GraphQLYoga and currently expects to connect to a MongoDb database. Ensure you have a MongoDb v4 or v5 running and available from the "mongo endpoint" set below in the environment. Ensure the mongo password and username have acccess to your mongodb instance.

Environment variables that are important in .env.local for local dev testing 

NODE_ENV="production" | "development"

MONGODB_URI="<mongo endpoint>"

MONGO_PASSWORD=""

MONGO_USERNAME=""

SITE_URL ="localhost:3000"  # endpoint for the web front end - ie. speedtest.k12.ne.us

MAILGUN_APIKEY - api key for mailgun authentication

MAILGUN_DOMAIN - email domain for mailgun api integration

optional

DEV_EMAIL_TO - an email that can be the "to" address for testing.

# docker Files
Dockerfile - is used for building the API Docker container.
build-docker.sh - bash script to build and push the API Docker container. You must update the repository path for the push to work.
docker-compose.yaml - Start a local MongoDb and MongoExpress containers for testing. You must update the Env settings with your values.

# Project Files
./src/gql/*   - GraphQL types, queries, and resolvers that define the API.
./src/helpers - Helper functions for sending email.
./index.js   - Main server definition. Now includes the websocket server and ws tests.

# Start Here
1>  edit docker-compose to update your Db User credentials and start your local MongoDb
2>  copy example..env.local to .env.local then update environment vars with your values.
3> install dependancies (npm i)
4> start local API instance (npm start)
5> Clone, Configure and start local Web app instance

# Latest Changes
moved websocket server into API so the proxy config needs to send websocket traffic to the API container now. WS speed tests improved to explude zero data flight time overhead. Improves relatave accuracy.

# Test Speed Accuracy
Our goal is to identify equipment that may have connectivity issues to start a conversation with the student to determine if an actual issue exists