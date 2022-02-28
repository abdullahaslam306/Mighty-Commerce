const GoogleSheets = require('../../infra/google-sheets');
const QtyAndPrice = require('../../models/qty-and-price');
const RepricerHub = require('../../models/repricer-hub');

const {
  log,
  toDecimal,
  getConfig,
  localDateTime,
} = require('../../infra/utils');


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
    let dbWrite = [];
    let itemsToUpdate = 
      await this.QtyAndPrice
        .find({
          $or: [{
            lastUpdated: null
          }, {
            lastUpdated: { $lt: new Date(new Date().getTime() - lastUpdatedSecs * 1000) }
          }]
        })
        .sort({"lastUpdated": 1})

    if (!itemsToUpdate.length) {
      return;
    } else {
      let updateRequests = [];
      itemsToUpdate.forEach(async nextToUpdate => {

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
      }
      else if (!source.length) {
        nextToUpdate.processStatus = 'no-source';
      } 
      else {
        let quantity = source[0].quantity,
        price = toDecimal(source[0].price) + toDecimal(source[0].shippingPrice);
        nextToUpdate.processStatus = 'initial';

      // batch update request here

      // update qty
      updateRequests.push(
        this.createUpdateRequests(
          getConfig(config, 'rangeForQtyAndLastScan'),
          nextToUpdate.index,
          [
        quantity,
        localDateTime()
      ]
      ));
      // update price
      updateRequests.push(
        this.createUpdateRequests(
          getConfig(config, 'rangeForPrice'),
           nextToUpdate.index,
           [ price ]
           ));
          }
         nextToUpdate.lastUpdated = new Date();
         dbWrite.push(this.createDBRequest(nextToUpdate));   
      })

      await this.sourceSheet.bulkUpdate(updateRequests, 'Batch Update');
    }
    await this.QtyAndPrice.bulkWrite(dbWrite);
  }

  // helper functions

  createUpdateRequests = (range, index, values) => { 
    range += index;
    return { 
            range: range,
            values: [ values ]
          }
        }
  createDBRequest = (currentItem) => {

    return { 
      updateOne: {
        "filter": { "asin" : currentItem.asin, "index": currentItem.index },
        "update": { $set : { "lastUpdated" : currentItem.lastUpdated, "processStatus" : currentItem.processStatus}}
      }
    }

  }
}
