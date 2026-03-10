
# In production, you need the ENV vars set how you want!
# DB_USER
# DB_PW
# DB_SRV
# DB_NAME
# SITE_URL    # this is who is calling for cors!
# AUTHTOKEN

docker run -d --rm --name speedtestapi -p 4000:4000 -e "NODE_ENV=production" -e "MONGO_USERNAME=myusername" -e "MONGO_PASSWORD=mypassword" --network speedtestdata -v ${PWD}:/usr/src/app -w /usr/src/app speedtestapi node index.js

