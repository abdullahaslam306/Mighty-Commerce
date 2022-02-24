const axios = require('axios');

const PAGE_SIZE = 40;

const DEV_STOP_PAGE = 100000;

const {
  getConfig,
  log,
  out,
  isDev,
  safe,
  logError
} = require('./utils')

module.exports = class Track17 {

  init(config) {
    this.instance = axios.create({
      baseURL: 'https://api.17track.net/track/v1',
      headers: {
        common: {
          '17token': getConfig(config, 'token')
        }
      }
    });
 //   this .safe =  safe; //.apply(this, 5, 30);
  }

  getRegisteredList() {
    return new Promise(async (resolve, reject) => {
      let results = [], page_no = 1;

      let getNextPage = async() => { 
        const response = await this.instance.post('gettracklist', { page_no });

        if (!response.data ||
          !response.data.data ||
          !response.data.data.accepted) {
          reject();
          return;
        }

        if (page_no == 1 && response.data.page.data_total) {
          await log(this, `gettracklist: data_total(${response.data.page.data_total}), page_total(${response.data.page.page_total})`);
        }

        response.data.data.accepted.forEach(i => results.push({
          number: i.number,
          carrier: i.w1
        }));

        if (isDev && page_no > DEV_STOP_PAGE) { 
          out(' getRegisteredList dev stop.');
          await log(this, `getRegisteredList: results(${results.length})`);
          resolve(results);
          return; 
        }
        
        if (page_no < response.data.page.page_total) {
          if (page_no % 5 == 0)
            out(page_no == 1 ? `${page_no}` : `,${page_no}`);
          page_no += 1;

          setTimeout(/*this.safe*/(getNextPage), 1000);
        } else {
          out(' getRegisteredList done.'); console.log();
          await log(this, `getRegisteredList: results(${results.length})`);
          resolve(results);
        }
      }

      /*this.safe*/(getNextPage)();
    });
  }

  register(list, opt = {}) {
    //list = list.filter(x => x.carrier && x.number)
    const method = opt.stop ? 'deletetrack' : 'register';

    return new Promise(async (resolve, reject) => {
      let results = { 
        accepted: [], 
        rejected: [],
        errors: []
      }, page_no = 0;

      await log(this, `register: list(${list.length}) pages(${list.length/PAGE_SIZE})`);

      let getNextPage = async() => { 
        page_no += 1;

        if (page_no % 5 == 0)
          out(page_no == 1 ? `${page_no}` : `,${page_no}`);

        const chunk = list.slice(0, PAGE_SIZE);

        list = list.slice(PAGE_SIZE);

        if (!chunk.length) {
          out(' register done.'); console.log();
          await log(this, `register: method(${method}) accepted(${results.accepted.length}) errors(${results.errors.length}), rejected(${results.rejected.length})`);
          resolve(results);
          return;
        }

        const response = await this.instance.post(method, chunk);
        let data = response.data.data, _error = response.data.code;

        if (_error !== 0) {
          reject("register: " + _error.code);
          return;
        }

        if (data.errors && data.errors.length)
          for (var error of data.errors)
            results.errors.push(error);

        if (data.accepted)
          for (var accepted of data.accepted)
            results.accepted.push(accepted);

        if (data.rejected)
          for (var rejected of data.rejected)
            if (rejected.error && rejected.error.code == -18019901) {
              results.accepted.push(rejected.number);
            } else {
              results.rejected.push({
                number: rejected.number,
                error: rejected.error.code
              })
            }

        setTimeout(/*this.safe*/(getNextPage), 1000);
      };

      /*this.safe*/(getNextPage)();
    });
  }

  getTrackInfo(list = []) {
    return new Promise(async (resolve, reject) => {
      let results = [], page_no = 0;

      await log(this, `getTrackInfo: list(${list.length}) pages(${list.length/PAGE_SIZE})`);

      const getNextPage = async () => {
        page_no += 1;

        if (page_no % 5 == 0)
          out(page_no == 1 ? `${page_no}` : `,${page_no}`);

        const chunk = list.slice(0, PAGE_SIZE);

        list = list.slice(PAGE_SIZE);

        if (!chunk.length) {
          out(' getTrackInfo done.'); console.log();
          await log(this, `getTrackInfo: ${results.length}`);
          resolve(results);
          return;
        }

        const response = await this.instance.post('gettrackinfo', chunk);

        if (!response.data ||
          !response.data.data) {
          reject();
          return;
        }

        let data = response.data.data, error = response.data.code;

        if (data.errors) {
          await log(this, "getTrackInfo error: ", data.errors)
          await logError(this, "getTrackInfo", data.errors[0].message)
          reject("getTrackInfo: " + data.errors.length);
          return;
        }
        
        if (error !== 0) {
          reject("getTrackInfo: " + error.code);
          return;
        }

        if (data.accepted) {
          data.accepted.forEach(i => results.push({
            number: i.number,
            status: i.track.e,
            eventLocation: i.track.z0 ? i.track.z0.c : null,
            eventContentDesc: i.track.z0 ? i.track.z0.z : null,
            lastEventTime: i.track.zex ? i.track.zex.dtL : null,
          }));
        }
      
        setTimeout(/*this.safe*/(getNextPage), 1000);
      }

      /*this.safe*/(getNextPage)();
    });
  }
}