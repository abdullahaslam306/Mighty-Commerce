const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data')

const urlBase = 'https://app.repricehub.com/api/jsonapi';

const methods = {
  getListings: "getListings"
}

const {
  getConfig,
  log,
  out,
  isDev,
  resolveFullPath
} = require('./utils')

module.exports = class RepricerHubAPI {

  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  getUrl(method) {
    return `${urlBase}/${method}?apiKey=${this.apiKey}`;
  }

  getListings() {
    return axios({
      url: this.getUrl(methods.getListings),
      method: 'get'
    });
  }
}