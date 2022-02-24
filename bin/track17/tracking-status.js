const Track17 = require('../../infra/track17')
const TrackingNumberHelpers = require('../../models/helpers/tracking-number');
  
const {
  TrackingNumber
} = require('../../models');

const {
  logError,
  log
} = require('../../infra/utils')

module.exports = class TrackingStatus {

  async init(config) {
    this.track17 = new Track17();
    this.track17.init({ token: config.token });
  }

  async run(config) {
    this.TrackingNumber1 = TrackingNumber(config.collection);

    const db = TrackingNumberHelpers.fromRawFiltered(await this.TrackingNumber1.find({ toScanStatus: true }));

  //  if (!db.length) return;

    // await this.TrackingNumber1.updateMany(
    //     { toScanStatus: true },
    //     { toScanStatus: false }
    //   )

    await log(this, `tracking status: to-scan(${db.length})`);

    const result = await this.track17.getTrackInfo(db);

    await log(this, `getTrackInfo: result(${result.length})`)

    if (!result.length) return;

    // const xxx = result.find(x=>x.number == '1ZRX95040328130352')

    // if (xxx) {
    //   console.log("xxx1234");
    // }

    for await (var value of result) {

      // if (value.number == '1ZRX95040328130352') {
      //   console.log("xxx!!!!");
      // }


      let doc = await this.TrackingNumber1.findOne({ 
        number: value.number,
        //carrier: value.carrier
      });

      if (!doc) {
        console.error('record not found');
        continue;
      }

      if (
        doc.status != value.status ||
        doc.eventLocation != value.eventLocation ||
        doc.eventContentDesc != value.eventContentDesc ||
        doc.lastEventTime != value.lastEventTime
      ) {
        doc.toUpdate = true;
        doc.status = value.status;
        doc.eventLocation = value.eventLocation;
        doc.eventContentDesc = value.eventContentDesc;
        doc.lastEventTime = value.lastEventTime;
      }
     
      doc.lastStatusUpdate = new Date();
      await doc.save();
    }
  }
}