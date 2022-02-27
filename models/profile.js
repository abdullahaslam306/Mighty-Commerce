const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Profile = new Schema({
  profile: String,
  enabled: Boolean,
  oneTime: Boolean,
  interval: Number,
  config: Object,
  load: String,
  policy: String,
  param: String,
  state: String,
  lastRun: Date,
  status: String,  //TODO: export to enum
});

module.exports = mongoose.model("profile", Profile);
