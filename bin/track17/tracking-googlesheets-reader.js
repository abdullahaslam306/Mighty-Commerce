const GoogleSheets = require('../../infra/google-sheets');

const {
  TrackingNumber
} = require('../../models');

const TrackingNumberHelpers = require('../../models/helpers/tracking-number');

const {
  getConfig,
  log,
} = require('../../infra/utils')


module.exports = class TrackingSpreadsheetReader {
  sourceSheet = new GoogleSheets();

  async init(config) {
    this.sourceSheet.keyFile = getConfig(config, 'fileAuth');
    this.sourceSheet.spreadsheetId = getConfig(config, 'file');
    await this.sourceSheet.init()
  }

  async run(config) {
    this.TrackingNumber1 = TrackingNumber(config.collection);

    let entries = await this.sourceSheet.getEntries(getConfig(config, 'range'), 'read tracking data');

    if (entries.length == 0) {
      await log(this, `skip 1`);
      return;
    }

    await log(this, `fetched ${entries.length} entries`);

    let values = TrackingNumberHelpers.fromGoogleSheetsValues(entries);

    for await (var item of values) {
      await this.TrackingNumber1.findOneAndUpdate(
        {
          index: item.index
        },
        item,
        {
          upsert: true
        })
    }

    entries = await this.sourceSheet.getEntries(getConfig(config, 'rangeForStatus'), 'read tracking status data');

    if (entries.length == 0) {
      await log(this, `skip 2`);
      return;
    }
    
    await log(this, `fetched ${entries.length} entries (for status)`);

    values = TrackingNumberHelpers.fromGoogleSheetsValuesForStatus(entries);

    for await (var item of values) {
      await this.TrackingNumber1.findOneAndUpdate(
        {
          index: item.index
        },
        item)
    }

    const maxIndex = TrackingNumberHelpers.maxIndex(values);

    let { deletedCount } = await this.TrackingNumber1.deleteMany({ index: { $gt: maxIndex }})

    if (deletedCount) {
      await log(this, `deletedCount(${deletedCount})`);
    }
  }
}