const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RepricerMerchantProfit = new Schema({
  repricer_name: String,
  profit: Number,
  process: Boolean,
});

module.exports = model => mongoose.model("repricer-repricer_name-profit" + (model ? "_" + model : ""), RepricerMerchantProfit);
