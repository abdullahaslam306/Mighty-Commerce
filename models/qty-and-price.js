const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const QtyAndPrice = new Schema({
  index: Number,
  asin: String,
  status: String,
  lastUpdated: Date,
  processStatus: String,
});

QtyAndPrice.index({ index:1 })

module.exports = model => mongoose.model("qty-and-price" + (model ? "_" + model : ""), QtyAndPrice);
