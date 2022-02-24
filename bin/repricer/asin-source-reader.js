const GoogleSheets = require('../../infra/google-sheets');

const RepricerASINSource = require('../../models/repricer-asin-source');

const {
  getConfig,
  log,
} = require('../../infra/utils')

module.exports = class AsinSourceReader {
  sourceSheet = new GoogleSheets();

  async init(config) {
    this.sourceSheet.keyFile = getConfig(config, 'fileAuth');
    this.sourceSheet.spreadsheetId = getConfig(config, 'file');
    await this.sourceSheet.init()
  }

  async run(config) {
    this.RepricerASINSource = RepricerASINSource(getConfig(config, 'collection'));

    let entries = await this.sourceSheet.getEntries(getConfig(config, 'range'), 'read asin source data');

    entries = entries.slice(1);
    
    await log(this, `fetched ${entries.length} entries`);

    for await (var item of entries) {
      await this.RepricerASINSource.findOneAndUpdate(
        {
          ASIN: item[0]
        },
        { 
          ASIN: item[0],
          source: item[1],
          hasVariations: (item[2] || '').length > 0,
        },
        {
          upsert: true
        })
    }
  }
}