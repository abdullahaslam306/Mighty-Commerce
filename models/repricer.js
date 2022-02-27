const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Repricer = new Schema({
  //hash: String,
  sku: String,
  marketplace: String,
  merchant_id: String,
  price_min: Number,
  price_max: Number,
  unit_cost: Number,
  unit_currency: String,
  shipping_cost: Number,
  shipping_currency: String,
  pickpack_cost: Number,
  pickpack_currency: String,
  rrp_price: Number,
  rrp_currency: String,
  vat_rate: Number,
  fee_listing: Number,
  fba_fee: Number,
  fba_currency: String,
  repricer_name: String,
  velocity_repricer_name: String,
  estimated_seller_count: Number,
  lowest_landed_price: Number,
  my_price: Number,
  my_shipping: Number,
  fba: String,
  asin: String,
  open_date: String,
  last_sale: String,
  quantity: Number
});

module.exports = model => mongoose.model("repricer" + (model ? "_" + model : ""), Repricer);