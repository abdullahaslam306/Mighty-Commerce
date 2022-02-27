const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RepricerStat = new Schema({
  scanTime: Date,
  total: Number,
  newState: Number,
  fetchedState: Number,
  errorState: Number,
  bypassedState: Number,
  otherState: Number,
  modified: Number,
  zeroPrice: Number,
  hasVariations: Number,
  hasSourceVariations: Number,
  scanMissing: Number,
  fileName: String,
  nanPrice: Number,
  debugSkipped: Number
});

module.exports = model => mongoose.model("repricer-stat" + (model ? "_" + model : ""), RepricerStat);
