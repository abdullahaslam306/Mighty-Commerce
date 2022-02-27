const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RepricerHub = new Schema({
  sellerId: String,
  asin: String,
  price: Number,
  shipping: Number,
  quantity: Number,
  lastUpdate: Date
});

RepricerHub.index({ sellerId:1, asin: 1 })
RepricerHub.index({ asin: 1, lastUpdate: 1 })


module.exports = model => mongoose.model("repricer-hub" + (model ? "_" + model : ""), RepricerHub);