import { ObjectId } from 'mongodb';
import {mongoRunQuery} from './speedtest.js'
import { sendEmail } from '../helpers/email.js'
const schoolTypeDefs = [`

type schoolRegistration {
    _id : String
    schoolName : String
    schoolNumber : String
    active : Boolean
    emailDomain : String
}

type schoolAdmin {
    _id : String
    name : String
    email : String
    active : Boolean
    schoolId : String
    siteManager : Boolean
    apiKey : String
}

type login {
    _id: String
    email: String
    requestTime: DateTime
    statusMessage: String 
}

type Query {
    schoolRegistrations(active: Boolean): [schoolRegistration]
    schoolRegistration(schoolNumber: String _id: String) : schoolRegistration
    schoolAdmin(email: String _id: String): schoolAdmin
    schoolAdmins(schoolId: String active: Boolean) : [schoolAdmin]
    login(_id : String, email: String, requestedSince: DateTime, statusMessage: String): login
    logins(requestedSince: Date): [login]
}

type Mutation {
    addSchoolRegistration(schoolRegistration: schoolRegistrationInput): Boolean
    updateSchoolRegistration(_id: String, schoolRegistration: schoolRegistrationInput): Boolean
    addSchoolAdmin(schoolAdmin: schoolAdminInput): Boolean
    updateSchoolAdmin(_id: String, schoolAdmin: schoolAdminInput): Boolean
    addLogin(email: String): String
    updateLogin(_id: String): Boolean
}

input schoolRegistrationInput {
    schoolName : String
    schoolNumber : String
    active : Boolean
    emailDomain : String
}

input schoolAdminInput {
    name : String
    email : String
    active : Boolean
    schoolId : String
    siteManager : Boolean
    apiKey : String
}

input loginInput {
    email: String
    requestTime: DateTime
    statusMessage: String 
}
`
]
let mongoConnect=`mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGODB_URI}/?authMechanism=DEFAULT`

const schoolResolvers = {
    Query: {
        schoolRegistration: async (_,{schoolNumber, _id, emailDomain}, {mdb, logger}) => {
            logger.info('get school', schoolNumber, _id)
            let filter = _id ? {_id:new ObjectId(_id)} : schoolNumber ? {schoolNumber : schoolNumber} : {emailDomain:emailDomain};
            let result = await mongoRunQuery('schoolRegistration',filter,null, mdb, logger)
            logger.info(result[0])
            return result[0]        
        },
        schoolRegistrations: async(_ ,{active}, {mdb, logger}) =>{
            logger.info('getting schools', active)
            let filter =  {active: active}
            let result = await mongoRunQuery('schoolRegistration',filter, null, mdb, logger)
            //logger.info(result)
            return result
        },
        schoolAdmin: async (_,{ _id, email}, {mdb, logger}) => {
            logger.info('get school admin', email, _id)
            let filter={}
            if(_id){filter._id=new ObjectId(_id)}
            if(email){filter.email=email}
            let result = await mongoRunQuery('schoolAdmin',filter, null, mdb, logger)
            //logger.info('one admin found',result[0])
            return result[0]        
        },
        schoolAdmins: async(_ ,{active, schoolId}, {mdb, logger}) =>{
            logger.info('getting school admins', active, schoolId)
            let filter =  {}
            if(active != undefined){filter.active=active}
            if (schoolId){filter.schoolId=schoolId}
            let result = await mongoRunQuery('schoolAdmin',filter, null, mdb, logger)
            //logger.info(result)
            return result
        },
        login: async(_ ,{_id, email, requestedSince, statusMessage}, {mdb, logger}) =>{
            logger.info('getting login', requestedSince)
            let filter =  {}
            if(_id) {filter._id= new ObjectId(_id)}
            if(email) {filter.email= email}
            if (requestedSince) { filter.requestTime =  {$gt: new Date(requestedSince)}}
            if (statusMessage){filter.statusMessage= statusMessage}
            let result = await mongoRunQuery('login',filter, null, mdb, logger)
            logger.info('login found', result)
            return result[0]
        },
        logins: async(_ ,{requestedSince}, {mdb, logger}) =>{
            logger.info('getting logins', requestedSince)
            let reqDate = new Date(requestedSince)
            let filter =  {requestTime: {$gt: reqDate}}

            let result = await mongoRunQuery('login',filter, null, mdb, logger)
            return result
        },
    },
    Mutation:{
        addSchoolRegistration: async(_,{schoolRegistration}, {mdb, logger}) => {
            logger.debug(schoolRegistration)
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('schoolRegistration');
                let existingSchool= await schoolResolvers.Query.schoolRegistration(_,{schoolNumber: schoolRegistration.schoolNumber},{"mdb": mdb, logger:logger})
                let existingSchoolEmail= await schoolResolvers.Query.schoolRegistration(_,{emailDomain: schoolRegistration.emailDomain},{"mdb": mdb, logger:logger})
                if (existingSchool || existingSchoolEmail)
                    {                       
                       logger.debug(existingSchool ? 'school Registration already exists' : existingSchoolEmail ? "school Email Domain already exists": "Error Duplicate School")
                       return false
                    }
                    else
                    {
                        await coll.insertOne(schoolRegistration);
                    }
                client.close()
                return true
            } catch (error) {
                client.close()
                logger.error(error)
                return false
            }

        },
        updateSchoolRegistration: async(_,{_id,schoolRegistration}, {mdb, logger}) => {
            logger.debug(schoolRegistration)
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('schoolRegistration');
                let existingSchool= await schoolResolvers.Query.schoolRegistration(_,{_id: _id},{"mdb": mdb, logger:logger})
                let existingSchoolEmail= await schoolResolvers.Query.schoolRegistration(_,{emailDomain: schoolRegistration.emailDomain},{"mdb": mdb, logger:logger})
                if (existingSchool && !existingSchoolEmail)
                    {
                        logger.debug(schoolRegistration)
                       let result= await coll.updateOne({_id:new ObjectId(_id)},{$set: schoolRegistration})
                       logger.debug(result)
                    }
                    else
                    {
                        logger.debug(existingSchoolEmail? 'school email already defined' : 'school not found')
                        return false;
                    }
                client.close()
                return true

            } catch (error) {
                client.close()
                logger.error(error)
                return false
            }
        },
        addSchoolAdmin: async (_,{schoolAdmin}, {mdb, logger}) => {
            logger.debug(schoolAdmin)
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('schoolAdmin');
                let existingAdminEmail= await schoolResolvers.Query.schoolAdmin(_,{email: schoolAdmin.email},{"mdb": mdb, logger:logger})
                if (existingAdminEmail)
                    {                       
                       logger.debug( 'school admin email already exists' )
                       return false
                    }
                    else
                    {
                        await coll.insertOne(schoolAdmin);
                    }
                client.close()
                return true

            } catch (error) {
                client.close()
                logger.error(error)
                return false
            }
        },
        updateSchoolAdmin: async (_,{_id, schoolAdmin}, {mdb, logger}) => {
            logger.debug(schoolAdmin)
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('schoolAdmin');
                let existingAdmin= await schoolResolvers.Query.schoolAdmin(_,{_id: _id},{"mdb": mdb, logger:logger})
                let existingAdminEmail = schoolAdmin.email && await schoolResolvers.Query.schoolAdmin(_,{email: schoolAdmin.email},{"mdb": mdb, logger:logger})
                logger.debug(existingAdmin, "email", existingAdminEmail)
                if (existingAdmin && !existingAdminEmail )
                    {          
                       let result= await coll.updateOne({_id:new ObjectId(_id)},{$set: schoolAdmin})
                       logger.debug(result)
                    }
                    else
                    {
                       logger.debug(existingAdmin ? 'school admin not found' : existingAdminEmail ? "email address already exists" : "school admin update fails" )
                       return false
                    }
                client.close()
                return true

            } catch (error) {
                client.close()
                logger.error(error)
                return false
            }
        },
        addLogin:async (_,{email}, {mdb, logger}) => {
            logger.debug('Adding login')
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('login');
                let existingNotExpiredLogin = await schoolResolvers.Query.login(_,{email: email, 
                    requestedSince: new Date().setMinutes(new Date().getMinutes() -10),
                    statusMessage:"requested"},{"mdb": mdb, logger:logger})
                if (existingNotExpiredLogin)
                    {                       
                       logger.debug( 'login exists',  )
                       return false
                    }
                    else
                    {
                        //check and see if there's an account.
                        let user = await schoolResolvers.Query.schoolAdmin(_,{email:email}, {mdb: mdb, logger:logger} )
                        if (user){
                           let mgresult = await coll.insertOne({requestTime: new Date(), email:email, statusMessage:"requested"});

                           //send email for the otp  
                            let mailBody = `You have requested to log on to Steadfast. Here is a link to complete the process. <br />
                            https://${process.env.SITE_URL}/login/${mgresult.insertedId}  <br /><br />
                            This link will be good for 30 minutes and can only be used once.`
                            sendEmail( email, "nmcclena@esu10.org", "[One Time Password for Steadfast]", mailBody) 
                        }
                        else{
                            logger.info('user not found no login email sent', email)
                        }
                    }
                client.close()
                return true

            } catch (error) {
                client.close()
                logger.error(error)
                return false
            }
        },
        updateLogin:async (_,{_id}, {mdb, logger}) => {
            const client = await mdb.connect(mongoConnect);
            try {
                const coll =client.db('STEADFAST').collection('login');
                let existingLogin= await schoolResolvers.Query.login(_,{_id: _id, statusMessage:"requested"},{"mdb": mdb, logger:logger})
                if (existingLogin  )
                    {          
                    let expireTime=new Date(existingLogin.requestTime).setMinutes(new Date(existingLogin.requestTime).getMinutes() +30)
                    logger.debug(existingLogin,expireTime )
                   if(existingLogin.requestTime < expireTime){
                        let result= await coll.updateOne({_id:new ObjectId(_id)},{$set: {statusMessage: `Logged in ${new Date()}`}})
                            logger.debug(result)
                        }
                        else{
                            logger.debug('login  expired' )
                            client.close()
                            return false
                        }
                    }
                    else
                    {
                       logger.debug('login not found'  )
                        client.close()
                        return false
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

export {schoolTypeDefs, schoolResolvers }


