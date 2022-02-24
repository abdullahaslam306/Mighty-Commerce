const mongoose = require("mongoose");
const LOCALHOST = 'localhost';
const DB_NAME = 'mighty';

const {
    logError,
    log
 } = require('./utils')

module.exports = class DB {
    static connectionFuture;

    constructor() {
        if (DB.connectionFuture) return;

        DB.connectionFuture = new Promise(async (resolve, reject) => {
            const connectionString = `mongodb://${process.env.DB_HOST || LOCALHOST}/${process.env.DB_NAME || DB_NAME}`;
            
            log(this, connectionString);
            mongoose.connection.once("open", async () => {
                this.connected = true;
                await log(this, "connected to " + connectionString );
                resolve();
            });
    
            mongoose.connection.on("error", async (err) => {
                await logError(this, 'connection on-error', connectionString);
                reject();
            });
    
            try {
                mongoose.connect(connectionString, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
            } catch (e) {
                await logError(this, 'connect', connectionString);
                reject()
            }
        });
    }
  
    async init() {
        return DB.connectionFuture;
    }

    async close() {
        if (this.connected)
            await mongoose.connection.close();
    }
}