const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { RepricerScanEnum } = require('./constants');

const RepricerScan = new Schema({
  hasVariations: Boolean,
  hasSourceVariations: Boolean,
  price: Number,
  shippingPrice: Number,
  remainQty: Number,
  asin: String,
  lastScan: Date,
  lastSeen: Date,
  url: String,
  status: {
    type: String,
    enum : Object.keys(RepricerScanEnum),
    default: RepricerScanEnum.NEW
  },
  fetchStatusErrorCode: Number,
});

RepricerScan.index({ asin: 1 })

module.exports = model => mongoose.model("repricer-scan" + (model ? "_" + model : ""), RepricerScan);
