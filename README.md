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
1>  edit docker-compose to update your Db User credentials and start your local MongoDb and mongoExpress instances.
2>  copy example..env.local to .env.local then update environment vars with your values.
3> install dependancies (npm i)
4> Follow database set-up below.
5> start local API instance (npm start)
6> Clone, Configure and start local Web app instance

# Database Set-up
While the passwordless login makes it easy to create admin accounts for schools, It creates a chicken-n-egg situation, the initial system admin account needs to exist so they can create the schools and admins. All accounts are tied to a school so a school object must exist before and admin can be assigned to it. A school admin can only access data from their school. A system admin can create schools and Admins and access all test data.
The database name is STEADFAST. there are four collections in the Db as follows:

## schoolRegistration - School objects
    {
        _id: String,    // mongodb assigned id
        schoolName: String, // Name of school
        schoolNumber: String,   // unique state ID for school/building
        active: Boolean,    // school is active in Steadfast system
        emailDomain,: String,    // email domain used by this school
    }

## schoolAdmin - Admin objects
    {
        _id: String,    // mongodb assigned id
        name: String,   // Name of Admin
        email: String,  // email address
        active: Boolean,    // account is active
        schoolId: String,   // _id of school object
        siteManager: Boolean,   // full site admin or school admin
        apiKey: String, // "", future use for M2M api access
    }

## login - login objects
    {
        _id: String,    // MongoDb assigned id
        requestTime: DateTime,  // start time of login request
        email: String,  // login request email
        statusMessage: String,  // login state "requested" or datetime of login success
    }

## SpeedTests - Machine and test result objects
    {
        _id: String,    // MongoDb assigned id
        machineId: String,  // machine system Id, mostly chromebooks
        machineGUID: String,    // system generated GUID if machineId = ""
        userId: String, // email of machine user if logged into Google or ""
        UserAgent: String,  // Agent/browser Id string
        platform: String,   // Hardware platform of device
        memory: Integer,    // MB of system RAM
        cores: Integer, // Number of CPU cores
        language: String,   // current language setting
        tests: Test[],  // Array of test result objects for this machine
        reportTime: DateTime,   // when the last report of tests was received
        reportScore: String,    // future rollup score
        reportLat: String,  // populated if geo data available
        reportLon: String,  // populated if geo data available
        reportIp: String,   // IP address of reporting machine
        school: String, // School state ID
    }

    Those are the four collections in the database. The last object is the Test results object added to the tests array for each machine when reported.

    {
        testingHost: String,    // extension name and version
        testTime: DateTime, // time and date of test
        ip: String,         // device IP address at time of test
        prelimRTT: Integer, // Round Trip Time in ms, from browser
        prelimDown: Integer,    // Dowl BPS from browser in MBPS
        coords: Object, // Geolocation data, Lat and Lon in object, when enabled
        geoPermission: Boolean, // User allowed position access
        connectionType: String, // connection type from browser
        fullDown: Integer,  // calculated MBPS
        fullUp: Integer,    // Calculated MBPS
        fullRTT: Integer,   // calculated RTT ms
        score: String,  // Internal connection speed score based on calculated values
    }

# Latest Changes
moved websocket server into API so the proxy config needs to send websocket traffic to the API container now. WS speed tests improved to explude zero data flight time overhead. Improves relatave accuracy.

# Test Speed Accuracy
Our goal is to identify equipment that may have connectivity issues to start a conversation with the student to determine if an actual issue exists