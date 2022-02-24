const SellingPartnerAPI = require('amazon-sp-api');

module.exports = class AmazonSellerAPI {

    async init (config) {
        this.client = new SellingPartnerAPI(config);
    }
    
    getOrders() {
        return this.client.callAPI({
            operation:'getOrders',
            endpoint:'orders',
        
            query:{
                MarketplaceIds:['ATVPDKIKX0DER'],
                CreatedAfter: '2022-01-01'
            },

            options:{
                version:'v0'
            }
        });
    }

    getOrderItems(orderId) {
        return this.client.callAPI({
            operation:'getOrderItems',
            endpoint:'orders',

            path: {
                orderId
            },

            options:{
                version:'v0'
            }
        });
    }
}