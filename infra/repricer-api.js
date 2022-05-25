const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data')

const url = 'https://api.xsellco.com/v1/repricers';

const {
  getConfig,
  log,
  out,
  isDev,
  resolveFullPath
} = require('./utils')

module.exports = class Repricer {

  init(config) {
	this.userName = config.userName;
	this.password = config.password;    
const encodedBase64Token = 
      Buffer
        .from(`${config.userName}:${config.password}`)
        .toString('base64');

    this.authorization = `Basic ${encodedBase64Token}`;
  }

  getFile(fileName) {
    return new Promise(async (resolve, reject) => {
      try {
        await log(this, 'start get file')
        const response = await axios({
          url,
          responseType: 'stream',
          method: 'get',
          headers: {
              Authorization: this.authorization,
          }
        });
        
        const writer = fs.createWriteStream(fileName)
        response.data.pipe(writer);
        writer.on('finish', async _ => { 
          await log(this, 'end get file')
          resolve();
        })
        writer.on('error', reject);
      } catch (e) {
        reject(`repricer get file: ${e.message}`);
      }
    })
  }

  async postFile(fileName) {
    // return new Promise(async (resolve, reject) => {
    //   try {
      await log(this, 'start post file')
	 const { execSync } = require('child_process');   
  const stdout = execSync(`curl --user '${this.userName}:${this.password}' --request POST --data-binary @${fileName} ${url}`);
	console.log(stdout);
     execSync(`find /var/www/info.net/html/ -name '*.csv' -type f -mtime +7 -delete`);    
    //   } catch (e) {
    //     reject(`repricer post file: ${e.message}`);
    //   }
    // })
  }
}

