const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RepricerASINSource = new Schema({
  ASIN: String,
  source: String,
  hasVariations: Boolean,
});

module.exports = model => mongoose.model("repricer-ASIN-source" + (model ? "_" + model : ""), RepricerASINSource);
