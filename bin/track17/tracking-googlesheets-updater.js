const GoogleSheets = require('../../infra/google-sheets');

const {
  TrackingNumber
} = require('../../models');

const TrackingNumberHelpers = require('../../models/helpers/tracking-number');

const {
  log,
  getConfig,
  localDate,
  localDateTime,
} = require('../../infra/utils')


module.exports = class TrackingSpreadsheetUpdater {
  sourceSheet = new GoogleSheets();

  async init(config) {
    this.sourceSheet.keyFile = getConfig(config, 'fileAuth');
    this.sourceSheet.spreadsheetId = getConfig(config, 'file');
    await this.sourceSheet.init()
  }

  async run(config) {
    this.TrackingNumber1 = TrackingNumber(config.collection);

    let toUpdate =
      await this.TrackingNumber1
        .findOne({ toUpdate: true })
    //.select('index status eventLocation eventContentDesc lastEventTime')

    if (!toUpdate) {
      //      console.log(`spreadsheets updater idle`);
      return;
    }

    toUpdate.googleSheetsUpdateStatus =
      await this.sourceSheet.update(getConfig(config, 'range'), toUpdate.index, [
        localDate(toUpdate.lastEventTime),
        TrackingNumberHelpers.getTrackingStatusDesc(toUpdate.status),
        toUpdate.eventLocation + '; ' + toUpdate.eventContentDesc,
        localDateTime()
      ], 'update tracking status');

    if (toUpdate.googleSheetsUpdateStatus) {
      toUpdate.toUpdate = false;
    }
    toUpdate.lastGoogleSheetsUpdate = new Date();

    await toUpdate.save();

    // await this.TrackingNumber1.findOneAndUpdate(
    //   {
    //     index: toUpdate.index
    //   },
    //   {
    //     toUpdate: false
    //   },
    //   {
    //     upsert: true
    //   })

    //log(this, `spreadsheets updater updated index ${toUpdate.index}`);
  }
}