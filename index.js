const args = process.argv.slice(2) || [];
//require('dotenv').config()

if (args[2]) {
    process.env.DB_HOST = args[2];
}

const DB = require('./infra/db');
const fs = require('fs');
const express = require("express");
const cors = require('cors');
//const jsftp = require('jsftp'); 
 
const { createAdminCRUD } = require("./react-admin");
const REACT_ADMIN_PORT = 4000;

const db = new DB();

const {
    Profile,
    Order,
} = require('./models');

const {
    loop,
    getFileTimestamp,
    isDev,
    log,
    logError
} = require('./infra/utils')

global.__basedir = __dirname;


log(this, `running in ${isDev ? "DEVELOPMENT" : "PRODUCTION"} mode`);

async function start() {
    switch (args[0]) {
        case 'export': {
            const profiles = await Profile.find({}).lean();
    
            var str = '[';
    
            for (var profile of profiles) {
                delete profile._id;
                str += JSON.stringify(profile, null, 2) + ",\n\n";
            }
    
            str = str.slice(0, -3) + ']';

            fs.writeFileSync(args[1], str);

            await log(this, `${profiles.length} exported to ${args[1]}`);

            await db.close();
            process.exit();
        }
        case 'wipe-import': {
            const { deletedCount } = await Profile.deleteMany({});
            await log(this, `${deletedCount} deleted from Profile collection`);
            //continue to next case without break here
        }
        case 'import': {
            const str = fs.readFileSync(args[1], "utf8");
    
            const profiles = JSON.parse(str);
    
            for (var profile of profiles) {
                await Profile.create(profile);
            }
    
            await log(this, `${profiles.length} imported from ${args[1]}`);

            await db.close();
            process.exit();
        }
        case 'wipe': {
            const { deletedCount } = await Profile.deleteMany({});
            await log(this, `${deletedCount} deleted from Profile collection`);

            await db.close();
            process.exit();
        }
    }

    let profiles;


    if (args[0]) { //load file 
        profiles = require(`./${args[0]}.json`);
        await log(this, `loaded ${profiles.length} profiles from file: ${args[0]}`);
    } else {
        profiles = await Profile.find({}).lean();
        await log(this, `loaded ${profiles.length} profiles from DB`);
    }


    if (args[1]) {
        selectedProfile = args[1];
        await log(this, 'selected profile: ' + selectedProfile);
    } else {
        selectedProfile = undefined;
    }

    for await (var profile of profiles) {
        if (selectedProfile && selectedProfile != profile.profile) continue;

        const instanceFile = `./bin/${profile.load}`;
        var instanceCls, instance;

        try {
            instanceCls = require(instanceFile);
        } catch (e) {
            await logError(this, 'require', instanceFile, e);
            process.exit();
        }

        try {
            instance = new instanceCls();
        } catch (e) {
            await logError(this, 'instanciate', instanceFile, e);
            process.exit();
        }

        try {
            await instance.init(profile.config);
        } catch (e) {
            await logError(this, 'init', instanceFile, e);
            process.exit();
        }

        loop(profile, instance)(); // don't await
    }
};

async function setupReactAdminServer() {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({extended:false}));
    app.use("/admin", createAdminCRUD());

    app.listen(REACT_ADMIN_PORT, async _ => await log(this, `React Admin Server started at port: ${REACT_ADMIN_PORT}`));
}

// function setupFTPServer() {
//     const port = 5000;
//     const ftpServer = new FtpSrv({
//         url: "ftp://0.0.0.0:" + port,
//         anonymous: true
//     });

//     ftpServer.on('login', (data, resolve, reject) => { 
//         if(data.username === 'anonymous' && data.password === 'anonymous'){
//             return resolve({ root:"/temp" });
//         }
//         return reject(new errors.GeneralError('Invalid username or password', 401));
//     });

//     ftpServer.listen().then(() => { 
//         log(this, 'Ftp server is starting...')
//     });

// }


db
    .init()
    .then(start)
    //.then(setupReactAdminServer)
    //.then(setupFTPServer)
    //.then(_ => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
