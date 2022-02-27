const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { OrderStatusEnum } = require('./constants');

const Order = new Schema({
  AmazonOrderId: String,
  EarliestShipDate: Date,
  SalesChannel: String,
  OrderStatus: String,
  NumberOfItemsShipped: Number,
  OrderType: String,
  IsPremiumOrder: Boolean,
  IsPrime: Boolean,
  FulfillmentChannel: String,
  NumberOfItemsUnshipped: Number,
  IsReplacementOrder: String,
  IsSoldByAB: Boolean,
  LatestShipDate: Date,
  ShipServiceLevel: String,
  IsISPU: Boolean,
  MarketplaceId: String,
  PurchaseDate: Date,
  ShippingAddress: {
    StateOrRegion: String,
    PostalCode: String,
    City: String,
    CountryCode: String
  },
  SellerOrderId: String,
  PaymentMethod: String,
  IsBusinessOrder: Boolean,
  OrderTotal: { 
    CurrencyCode: String, 
    Amount: Number 
  },
  PaymentMethodDetails: [ String ],
  IsGlobalExpressEnabled: Boolean,
  LastUpdateDate: Date,
  ShipmentServiceLevelCategory: String,
  status: {
    type: String,
    enum : Object.keys(OrderStatusEnum),
    default: OrderStatusEnum.NEW
  },
});

module.exports = model => mongoose.model("order" + (model ? "_" + model : ""), Order);
