const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const LogModel = new Schema({
  caller: String,
  msg: String,
  timestamp: Date,
});

module.exports = mongoose.model("log", LogModel);
