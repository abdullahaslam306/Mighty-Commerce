const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const OrderItem = new Schema({
  //"BuyerInfo": {},
  TaxCollection: {
    Model: String,
    ResponsibleParty: String
  },
  ProductInfo: {
      NumberOfItems: Number
  },
  ItemTax: {
      CurrencyCode: String,
      Amount: Number
  },
  QuantityShipped: Number,
  ItemPrice: {
      CurrencyCode: String,
      Amount: Number
  },
  ASIN: String,
  SellerSKU: String,
  Title: String,
  SerialNumberRequired: Boolean,
  IsGift: Boolean,
  IsTransparency: Boolean,
  QuantityOrdered: Number,
  PromotionDiscountTax: {
      CurrencyCode: String,
      Amount: Number
  },
  PromotionDiscount: {
      CurrencyCode: String,
      Amount: Number
  },
  OrderItemId: Number
});

module.exports = model => mongoose.model("orderItem" + (model ? "_" + model : ""), OrderItem);
