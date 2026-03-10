import 'dotenv/config'

import { createYoga, createSchema } from 'graphql-yoga'
import { createServer } from 'node:http'
import { useDisableIntrospection } from '@graphql-yoga/plugin-disable-introspection'
import { speedTestTypeDefs, speedTestResolvers }  from './src/gql/speedtest.js'
import { schoolTypeDefs, schoolResolvers }  from './src/gql/school.js'
import { MongoClient as mdb } from 'mongodb'
import log4js from 'log4js'
import { randomUUID } from 'crypto';
import { WebSocketServer as wsServer } from 'ws';
import * as url from 'url';
import * as requestIp from 'request-ip';

const logger = log4js.getLogger("STEADfast API");
const logOPTS = {
    appenders: {
        console: { type: "stdout" },
        logfile: {
            type: "file",
            filename: "./stLogs.log",
            maxLogSize: 10485760,
            backups: 3,
            compress: true,
        },
        // gelf: {
        //     type: "@log4js-node/gelf",
        //     host: "logs.ops.esu10.org",
        //     port: 1541,
        //     source: process.env.SITE_URL || "dev",
        //     customFields: { '_sourceModuleName':'STEADfastAPILogger' }
        // },
    },
    categories: {
        default: { appenders: [ "logfile", "console" ], level: "warn" },
    },
};
// modify logging for dev
if (!(process.env.NODE_ENV === "production")) {
    logOPTS.categories.default = { appenders: [ "console" ], level: "debug" };
}
log4js.configure(logOPTS)
logger.info("SpeedTest API starting up!");

// GraphQL-yoga server options
const optsD = {
    graphiql: true,
    port: 4000,
    endpoint: "/data/api",
    plugins:[]
};
const optsP = {
    endpoint: "/data/api",
    graphiql: false,
    port: 4000,
    landingPage: false,
    plugins:[useDisableIntrospection()]
};

logger.info(`The current Node env: ${process.env.NODE_ENV}`);
const opts = process.env.NODE_ENV === "production" ? optsP : optsD;

const whitelist = [
    `https://${process.env.SITE_URL}`,
    `http://${process.env.SITE_URL}`,
    `https://www.${process.env.SITE_URL}`,
    `http://www.${process.env.SITE_URL}`,
];

if(!process.env.SITE_URL) {
    whitelist.push("http://localhost:3000");
    whitelist.push("http://localhost:8080");
    whitelist.push("http://localhost:4000");
    whitelist.push("http://localhost:56995");
}
logger.info("CORS white list:", whitelist);



const schema = createSchema({
  typeDefs: [speedTestTypeDefs,schoolTypeDefs],
  resolvers: [speedTestResolvers,schoolResolvers]
})

const yoga = createYoga({
  schema: schema,
  graphiql: opts.graphiql,
  graphqlEndpoint: opts.endpoint,
  context: {mdb: mdb, logger:logger},
  logging: {
    debug(...args) {
      logger.debug(...args)
    },
    info(...args) {
      logger.info(...args)
    },
    warn(...args) {
      logger.warn(...args)
    },
    error(...args) {
      logger.error(...args)
    }
},
 plugins:opts.plugins,
//  cors:  (request) => {
//     const requestOrigin = request.headers.get('origin')
//     let allowedOrigin = (requestOrigin && (whitelist.includes(requestOrigin) || requestOrigin.includes("chrome"))) ? requestOrigin : false
//     logger.debug('origin - request - allowed', requestOrigin, allowedOrigin );
//     return {
//         credentials: true,
//         allowedHeaders: ['X-Custom-Header','content-type','authtoken'],
//         methods: ['POST'],  
//         origin: allowedOrigin,
//     }
//     },
  }
)

const server = createServer(yoga)

// Set up a headless websocket server that prints any
// events that come in.
const wssRTT = new wsServer({ noServer: true });
const wssUp = new wsServer({ noServer: true });
const wssDown = new wsServer({ noServer: true });

wssRTT.on('connection', socket => {
  socket.on('message', message => {
    socket.send(message)
    console.log(`*** RTT msg: ${message.toString()}`)
  });

  socket.on('error', (error) => {
    console.log("!!! RTT Error! - ", error)
  });

});

wssUp.on('connection', socket => {
  socket.on('message', message => {
    socket.send(Date.now())
    console.log(`*** UPt msg: ${message.toString()}`)
  });

  socket.on('error', (error) => {
    console.log("!!! UPT Error! - ", error)
  });
});

wssDown.on('connection', socket => {
  socket.on('message', message => {
    let cmd = JSON.parse(message.toString())

    if(cmd && cmd.size && cmd.size>0) {
      cmd.size = Math.min(cmd.size,50); // Limit 50MB
    }else{  // no size received
      cmd = {size: 0.00001}  // default to min bytes
    }

    socket.send(Buffer.allocUnsafe(cmd.size * 1024000))
    console.log('*** DLt cmd: ', cmd);
  });

  socket.on('error', (error) => {
    console.log("!!! DLT Error! - ", error)
  });
});


const appSrv = server.listen(opts.port, ()=>{ console.info(`server up! at http://localhost:${opts.port}${opts.endpoint}`)})


appSrv.on('upgrade', (request, socket, head) => {
  const path = url.parse(request.url).pathname;
  // const auth = request.headers.authToken;

  // if (!auth === 'stupidDev4Auth') {
  //   console.log('*** Auth Error!!!');
  //   socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  //   socket.destroy();
  //   return;
  // }
  // todo: check authtoken and reject here! No custom header support!
  //    use request.headers object to find it
  console.log(`*** WS connect - path: ${path}`)

  if(path == '/doRTT') {
    wssRTT.handleUpgrade(request, socket, head, socket => {
      wssRTT.emit('connection', socket, request);
      console.log('   Connecting RTT, head: ', head.toString());
    });
  } else

  if(path == '/doUPt') {
    wssUp.handleUpgrade(request, socket, head, socket => {
      wssUp.emit('connection', socket, request);
      console.log('   Connecting UPt, head: ', head.toString());
    });
  } else

  if(path == '/doDLt') {
    wssDown.handleUpgrade(request, socket, head, socket => {
      wssDown.emit('connection', socket, request);
      console.log('   Connecting DLt, head: ', head.toString());
    });
  } else {
    socket.destroy()
  }
});

