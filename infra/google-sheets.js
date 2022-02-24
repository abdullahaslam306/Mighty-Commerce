const { google } = require("googleapis");
//const { canUpdate } = require('./config')
const canUpdate = true;

const {
  logError,
  log
} = require('./utils')

module.exports = class GoogleSheets {
  constructor() {
  }

  set spreadsheetId(value) {
    this._spreadsheetId = value;
  }

  set keyFile(value) {
    this._keyFile = value;
  }

  async init() {
    return new Promise(async (resolve) => {

      this.auth = new google.auth.GoogleAuth({
        keyFile: this._keyFile,
        scopes: "https://www.googleapis.com/auth/spreadsheets",
      });
  
      const client = await this.auth.getClient();
  
      this.spreadsheets = google.sheets({ version: "v4", auth: client }).spreadsheets;
  
      resolve();
    });
  }

  async getEntries(range, desc) {
    if (!desc) desc = "";
    
    await log(this, `getting range: ${range}... (${desc})`);

    try {
      const rowsData = await this.spreadsheets.values.get({
        auth: this.auth,
        spreadsheetId: this._spreadsheetId,
        range
      });

      const values = rowsData.data.values.slice(1)

      return values;
    } catch (e) {
      await logError(this, `getEntries (${desc})`, this._spreadsheetId + ' ' + range, e);
      return [];
    }
  }

  async update(range, index, values, desc) {
    await log(this, `${canUpdate ? '' : 'bypassed'} update: ${range} ${index} : ${values}`);

    if (!canUpdate) {
      return;
    }

    try {
      range += index;

      await this.spreadsheets.values.update(
        {
          auth: this.auth,
          spreadsheetId: this._spreadsheetId,
          range,
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [ values ],
          },
        });

      return true;
    } catch (e) {
      await logError(this, `update (${desc})`, this._spreadsheetId + ' ' + range + ' ' + index, e);
      return false;
    }
  }
}