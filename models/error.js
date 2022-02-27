const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ErrorModel = new Schema({
  caller: String,
  type: String,
  data: String,
  message: String,
  timestamp: Date,
});

module.exports = mongoose.model("error", ErrorModel);
