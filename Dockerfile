FROM quay.io/yldio/paz-base

RUN apk --update add bash openssh

ADD ./package.json /usr/src/app/package.json
WORKDIR /usr/src/app
RUN npm install

ADD ./bin /usr/src/app/bin
ADD ./lib /usr/src/app/lib
ADD ./hooks /usr/src/app/hooks
ADD ./middleware /usr/src/app/middleware
ADD ./test /usr/src/app/test
ADD ./resources /usr/src/app/resources
ADD ./server.js /usr/src/app/server.js

EXPOSE 9002

CMD [ "./bin/server" ]
