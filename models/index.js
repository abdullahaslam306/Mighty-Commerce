const TrackingNumber = require("./tracking-number");
const ErrorModel = require("./error");
const LogModel = require("./log");
const Profile = require("./profile");
const Order = require("./order");
const OrderItem = require("./orderItem");
const Repricer = require("./repricer");
const RepricerHub = require("./repricer-hub");

module.exports = {
  TrackingNumber: model => TrackingNumber(model),
  ErrorModel,
  LogModel,
  Profile,
  Order: model => Order(model),
  OrderItem: model => OrderItem(model),
  Repricer: model => Repricer(model),
  RepricerHub: model => RepricerHub(model),
};
