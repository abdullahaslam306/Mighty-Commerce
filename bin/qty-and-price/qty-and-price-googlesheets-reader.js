const GoogleSheets = require('../../infra/google-sheets');

const QtyAndPrice = require('../../models/qty-and-price');

const DEV_LIMIT = 20;

const upsert = {
  upsert: true
}

const {
  getConfig,
  log,
  devLimit,
} = require('../../infra/utils')

module.exports = class QtyAndPriceGooglesheetsReader {
  sourceSheet = new GoogleSheets();

  async init(config) {
    this.sourceSheet.keyFile = getConfig(config, 'fileAuth');
    await this.sourceSheet.init()
  }

  async run(config) {
    this.sourceSheet.spreadsheetId = getConfig(config, 'file');
    this.QtyAndPrice = QtyAndPrice(getConfig(config, 'collection'));

    const rows = await this.sourceSheet.getEntries(getConfig(config, 'range'), 'read qty-and-price data');

    if (!rows.length) return;
    
    const values = rows.slice(1).map((values,i) => { return {
      key: {
        index: i+3,
      },
      value: {
        asin: values[0],
        status: values[1],
      }
    }});

    await log(this, `fetched ${values.length} entries`);

    for await (var item of values) {
      await this.QtyAndPrice.findOneAndUpdate(item.key, item.value, upsert)
      if (devLimit(DEV_LIMIT)) {
        break;
      }
    }
  }
}