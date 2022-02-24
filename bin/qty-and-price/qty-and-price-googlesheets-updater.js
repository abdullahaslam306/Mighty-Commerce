const GoogleSheets = require('../../infra/google-sheets');
const QtyAndPrice = require('../../models/qty-and-price');
const RepricerHub = require('../../models/repricer-hub');

const {
  log,
  toDecimal,
  getConfig,
  localDate,
  localDateTime,
} = require('../../infra/utils');
const qtyAndPrice = require('../../models/qty-and-price');


module.exports = class QtyAndPriceGooglesheetsUpdater {
  sourceSheet = new GoogleSheets();

  async init(config) {
    this.sourceSheet.keyFile = getConfig(config, 'fileAuth');
    await this.sourceSheet.init()
  }

  async run(config) {
    this.sourceSheet.spreadsheetId = getConfig(config, 'file');
    this.QtyAndPrice = QtyAndPrice(getConfig(config, 'collection'));
    this.RepricerHub = RepricerHub(getConfig(config, 'sourceCollection'));
    
    const lastUpdatedSecs = getConfig(config, 'lastUpdatedSecs');

    let nextToUpdate = 
      await this.QtyAndPrice
        .find({
          $or: [{
            lastUpdated: null
          }, {
            lastUpdated: { $lt: new Date(new Date().getTime() - lastUpdatedSecs * 1000) }
          }]
        })
        .sort({"lastUpdated": 1})
        .limit(1);

    if (!nextToUpdate.length) {
      return;
    } else {
      nextToUpdate = nextToUpdate[0];
    }

    const source = await this.RepricerHub.aggregate([
      { $match: { "asin": nextToUpdate.asin } },
      { $sort:{ "lastUpdate": - 1} },
      { "$group" : {
      _id:"$asin",
          price: { $first: '$price' },
          shipping: { $first: '$shipping' },
          quantity: { $first: '$quantity' },
      }}
    ])

    if (nextToUpdate.status != 'PENDING') {
      nextToUpdate.processStatus = 'skipped-not-pending';
    } else if (!source.length) {
      nextToUpdate.processStatus = 'no-source';
    } else {
      let quantity = source[0].quantity,
          price = toDecimal(source[0].price) + toDecimal(source[0].shippingPrice);

      nextToUpdate.processStatus = 'initial';

      if (
        await this.sourceSheet.update(getConfig(config, 'rangeForQtyAndLastScan'), nextToUpdate.index, [
          quantity, localDateTime()
        ], 'update qty-and-last-scan')
      ) {
        nextToUpdate.processStatus += ' updated-qty-last-scan'
      } else {
        nextToUpdate.processStatus += ' error-update-qty-last-scan'
      }

      if (
        await this.sourceSheet.update(getConfig(config, 'rangeForPrice'), nextToUpdate.index, [
          price
        ], 'update price')
      ) {
        nextToUpdate.processStatus += ' updated-price'
      } else {
        nextToUpdate.processStatus += ' error-update-price'
      }
    }

    nextToUpdate.lastUpdated = new Date();
    await nextToUpdate.save();
  }
}