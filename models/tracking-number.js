const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const falseBoolean = {
  type: Boolean,
  default: false
}

const TrackingNumberSchema = new Schema({
  index: Number,
  number: String,
  carrierRaw: String,
  carrier: Number,
  status: Number,
  eventLocation: String,
  eventContentDesc: String,
  lastEventTime: Number,
  registrationStatus: String,
  toUpdate: falseBoolean,
  toScanStatus: falseBoolean,
  statusInternal: String,
  registrationError: Number,
  lastStatusUpdate: Date,
  lastGoogleSheetsUpdate: Date,
  googleSheetsUpdateStatus: Boolean
});

module.exports = model => mongoose.model("trackingNumber" + (model ? "_" + model : ""), TrackingNumberSchema);
