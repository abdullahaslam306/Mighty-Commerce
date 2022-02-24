const fs = require('fs');
const Path = require('path')  
const { DateTime } = require("luxon");

const DB = require('./db');

// const DEVELOPMENT = 'development'
// const env = process.env.NODE_ENV || DEVELOPMENT;
//const isDev = env == DEVELOPMENT;

const isDev = !fs.existsSync("../production");


const {
  ErrorModel,
  LogModel,
  Profile,
} = require('../models');


function isURL(str) {
  const pattern = new RegExp(/^(http|https):\/\/[^ "]+$/);
  return !!pattern.test(str);
}

function now() {
  return new Date().getTime();
}

function localDate(date) {
  const _date = date ? new Date(parseInt(date)) : new Date();
  return _date.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })
}

function localDateTime(date) {
  const _date = date ? new Date(parseInt(date)) : new Date();
  return _date.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
}

function getConfig(config, key, allowMissing) {
  if (!config[key] && !allowMissing) {
    throw new Error("missing " + key);
  }
  return config[key];
}

async function logError(caller, type, data, e) {
  const message = e ? e.message : '';

  await log(caller, 'ERROR: ' + type + ' ' + data + ' ' + message);

  if (e) {
    console.error(new Date(), e);
  }

  return ErrorModel.create({ 
    caller: caller.constructor.name == "Object" ? '' : caller.constructor.name,
    type,
    data,
    message,
    timestamp: new Date()
  });
}

// async function safe(fn) {
//   try {
//     await fn();
//   } catch (e) {
//     console.error(e);

//     if (true) {
//       fn();
//     }
//   }
// }

function safe(/*context, tryCount, delay,*/ fn) {
  return fn();
  // return async _ => {
  //   let count = 0;
  //   while (count < 0) {

  //     try {

  //     } catch (e) {
  //       logError("safe", undefined, e)
  //     }
  //   }
  // }
}



function log(caller, msg) {
  const timestamp = 
    DateTime
    .now()
    .setZone('Asia/Jerusalem')  
    .toFormat('yyyyLLdd-HHmmss');

  const caller_ = caller.constructor.name == "Object" ? '' : ` (${caller.constructor.name})`;

  console.log(timestamp + caller_ + " " + msg);

  return LogModel.create({ 
    caller: caller.constructor.name == "Object" ? '' : caller.constructor.name,
    msg,
    timestamp: new Date()
  });

}

function logLn(msg) {
  console.log(msg);
}

function logJSON(obj) {
  console.log(JSON.stringify(obj, null, 40));
}

function out(msg) {
  process.stdout.write(msg);
}

function loop(profile, instance) {
  const _fn = async () => {
    const profileModel = profile._id ? await Profile.findOne({ _id: profile._id }) : profile;

    if (!profileModel) { return; }

    let interval;

    if (profileModel.enabled) {
      //console.log('starting ' + profileModel.profile);
      if (profileModel._id)
        await profileModel.updateOne({ status: 'starting' });

      try {
        const state = await instance.run(profileModel.config, profileModel.param, profileModel.state);
        if (profileModel._id)
          await profileModel.updateOne({ status: 'done', state });
      } 
      catch(e) {
        if (profileModel._id) {
          await profileModel.updateOne({ status: 'error' });
        }
        await logError(this, 'loop', profile.profile, e);
      }

      interval = profileModel.interval;
    } else {
      profileModel.status = 'disabled';
      interval = 2;
    }

    if (profileModel._id) {
      await profileModel.updateOne({ lastRun: new Date() });
    }

  //    if (profileModel._id /*profileModel.oneTime*/) {
    setTimeout(_fn, interval * 1000);
    // } else {
    //   console.log("exiting after onetime");
    //   process.exit();
    // }
  }

  return _fn;
}

function resolveFullPath(dir, fileName) {
  const fullDir = Path.resolve(__basedir, dir);

  if (!fs.existsSync(fullDir)){
    fs.mkdirSync(fullDir, { recursive: true });
  }

  return Path.resolve(fullDir, fileName)
}

function getFileTimestamp(fileName) {
  const timestamp = 
    DateTime
    .now()
    .setZone('Asia/Jerusalem')  
    .toFormat('yyyyLLdd-HHmm');

  return `${timestamp}-${fileName}`;
}

function toDecimal(value) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function roundHalf(num) {
  return Math.round(num*2)/2;
}

var devLimitCounter = 0;

function devLimit(num) {
  if (!isDev || num == 0) return false;

  devLimitCounter += 1;

  if (devLimitCounter >= num) {
    devLimitCounter = 0;
    console.log('DEV LIMIT STOPPED AT ' + num);
    return true;
  }
}

module.exports = {
  isURL,
  now,
  logError,
  loop,
  safe,
  getConfig,
  log,
  logLn,
  out,
  localDate,
  localDateTime,
  isDev,
  logJSON,
  resolveFullPath,
  getFileTimestamp,
  toDecimal,
  roundHalf,
  devLimit
}
