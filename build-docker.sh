npm i
# npm audit fix
docker build -t harbor.srv.private/speedtest/speedtestapi:latest .
docker push harbor.srv.private/speedtest/speedtestapi:latest
