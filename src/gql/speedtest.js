
const speedTestTypeDefs = [`
scalar DateTime
scalar Date
scalar Timestamp

type machine {
    _id : String
    machineId : String
    machineGUID : String
    userId : String
    userAgent : String
    platform : String
    memory: String
    cores: Int
    language: String
    tests : [speedTest]
    reportTime : DateTime
    reportScore : String
    reportLat: Float
    reportLon: Float
    reportIp: String
    school: String
}

type speedTest {
    testingHost : String
    testTime : DateTime
    ip : String
    prelimRTT : String
    prelimDown : Int
    coords : coords
    geoPermission : Boolean
    connectionType : String
    fullDown : Int
    fullUp : Int
    fullRTT : Int
    score: String
}

type coords {
    accuracy: Float
    latitude: Float
    longitude: Float
}

type counts { 
    _id: Int,
    count: Int}

type Query {
    speedTestMachine(machineGUID: String): machine
    speedTestMachines(start: DateTime end: DateTime, domain:String) : [machine]
    schoolDownloadGrouped(start: DateTime end: DateTime, domain:String) : [counts]
    schoolUploadGrouped(start: DateTime end: DateTime, domain:String) : [counts]
}

input machineInput {
    machineId : String
    machineGUID : String
    userId : String
    userAgent : String
    platform : String
    memory: String
    cores: Int
    language: String
    tests : [speedTestInput]
    reportTime : DateTime
    reportScore : String
    reportLat: Float
    reportLon: Float
    reportIp: String
    school: String
}

input speedTestInput {
    testingHost : String
    testTime : DateTime
    ip : String
    prelimRTT : String
    prelimDown : Int
    coords : coordsInput
    geoPermission : Boolean
    connectionType : String
    fullDown : Int
    fullUp : Int
    fullRTT : Int
    score: String
}

input coordsInput {
    accuracy: Float
    latitude: Float
    longitude: Float
}

type Mutation {
    addMachineReport(machine: machineInput): Boolean
}

`,];


let mongoConnect=`mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGODB_URI}/?authMechanism=DEFAULT`

const mongoRunQuery = async (collection, filter, agg, mdb, logger) => {
    //logger.debug(mongoConnect)
    logger.info('mongo run filter: ', filter, JSON.stringify(agg))
    const client = await mdb.connect(mongoConnect);
    const coll = await client.db('STEADFAST').collection(collection);
    let cursor = null;
    if(filter) {
        cursor = await coll.find(filter);
    }
    if(agg) {cursor= await coll.aggregate(agg)}
    const  result = await cursor.toArray()
    client.close()
    return result
}

const speedTestResolvers = {
    Query: {
        speedTestMachine: async (_,{machineGUID}, {mdb, logger}) => {
            logger.info('get machine', machineGUID)
            const filter = {machineGUID : machineGUID};
            let result = await mongoRunQuery('SpeedTests',filter, null, mdb, logger)
            //logger.info(result[0])
            return result[0]

        },
        speedTestMachines: async(_ ,{start, end, domain}, {mdb, logger}) =>{
            logger.info('getting machines', mdb)
            let filter = {};
            if(start) {
                filter.tests.testTime = {$gt: start}
                if(end) {
                filter.tests.testTime = {$lt: end}
                }
            }
            if (domain){ filter.userId={'$regex': `${domain}`}}
            logger.debug(filter)
           let result = await mongoRunQuery('SpeedTests',filter, null, mdb, logger)
            //logger.info(result)
            return result
        },
        schoolDownloadGrouped: async(_ ,{start, end, domain}, {mdb, logger}) =>{
                logger.info('getting agg down')
                const agg = [
                {
                    '$match': {
                    'userId': new RegExp(domain)
                    }
                }, {
                    '$unwind': {
                    'path': '$tests'
                    }
                }, {
                    '$match': {
                    'tests.testTime': {
                        '$gt': start, 
                        '$lt': end
                    }
                    }
                }, {
                    '$bucket': {
                    'groupBy': '$tests.fullDown', 
                    'boundaries': [
                        0, 1, 25, 100
                    ], 
                    'default': 100, 
                    'output': {
                        'count': {
                        '$sum': 1
                        }
                    }
                    }
                }
                ];
                 let result = await mongoRunQuery('SpeedTests',null, agg, mdb, logger)
                logger.info(result)
                return result
        },
        schoolUploadGrouped: async(_ ,{start, end, domain}, {mdb, logger}) =>{
                const agg = [
                {
                    '$match': {
                    'userId': new RegExp(domain)
                    }
                }, {
                    '$unwind': {
                    'path': '$tests'
                    }
                }, {
                    '$match': {
                    'tests.testTime': {
                        '$gt': start, 
                        '$lt': end
                    }
                    }
                }, {
                    '$bucket': {
                    'groupBy': '$tests.fullUp', 
                    'boundaries': [
                        0, 1, 3, 20
                    ], 
                    'default': 20, 
                    'output': {
                        'count': {
                        '$sum': 1
                        }
                    }
                    }
                }
                ];
                let result = await mongoRunQuery('SpeedTests',null, agg, mdb, logger)
                logger.info(result)
                return result
        }

    },
    Mutation: {
        addMachineReport: async (_, {machine}, {mdb, logger}) => {
            logger.info(machine)
            logger.info(mongoConnect)
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('SpeedTests');
                let reportedMachine
                if(machine.machineGUID){
                    reportedMachine= await speedTestResolvers.Query.speedTestMachine(_,{"machineGUID": machine.machineGUID},{"mdb": mdb})
                }
                if (reportedMachine)
                    {
                        let alltests = [... reportedMachine.tests, ...machine.tests]
                        //nope, just pull the tests and add them to the existing machine
                       await coll.updateOne({_id:reportedMachine._id},{$set: {tests: alltests}})
                    }
                    else
                    {
                        await coll.insertOne(machine);
                    }
                client.close()
                return true

            } catch (error) {
                client.close()
                logger.error(error)
                return false
            }

        }
    }
}

export {speedTestResolvers, speedTestTypeDefs, mongoRunQuery}