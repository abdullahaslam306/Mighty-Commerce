const AmazonSellerAPI = require('../../infra/amazon-spapi');





//const SellingPartnerAPI = require('amazon-sp-api');

const refresh_token = 
//'Atzr|IwEBIO5fNWAfGEfJ90wRwE8u6e-OgMquXCc7Mtw76heuoYcCtEYo_1eCGxjgHZqiMwVDTlNBHQ9Jx_YMbu0b4JxIChQRoH92gwhFi6Sv-UtJSbN_C_yoL-GPeIlFLe22v_QHG_YZ5RXQ4cUlaUNcgeGjf3Ri75SMX1sQSzoqby68B1I4el8nyBUcpJr8lJsIQXMk6ceM2rudl6hFmwg9WlrLU9METqGLxaEVTyxPdV9yQY9EjOpquyejXYwQdMAZQXucqZkzFJZzA4rRdOpVh3dBFXjbMzKFSfgBNHlwbsemAJJPm961fjQ3muMWVq-7kfO7XFI';
//'Atzr|IwEBIAWE_ef_bKXrxydhI6NVZ6vmF96zSKW8s0nUkgr1rCBR4cTgNVsZqiE3AupdsXjvr9gDS2BOeFOWzcaMiI3LxIInPG0xPVHe7IACuQkyNIEFkPJpzfxaduxBfluP-OtbqyEdpIaHWn4SZbSIT2TQURTGIU37VPDn73Wp4DUuZW_XmhSdK1WqrLdxq7DtUXEHN3uY-0B3ODYPB7nbWEGBJXGU0BpAF9TH3qLK0rQ1nrM8d0XYT7HiS7uOrK4Uw-a50QuWHJSDMcpZqJD1MlVkOID0NIFcE5ZsALqbBPJKvBXv3hl5HjAH9ZYFgt1JqX2TZuo';
'Atzr|IwEBIGcpJ-3f2ADw2Crn4zBRnNaDyYB9V06IfnoT9DiQGXt6e5vQ25HOuR16KNO3FjtmxH7PLfRyAC0oDSWQdOXsu_LpQLa3NN1E0bcbXfDDCE3SjbhXvWhHPMmiWvTGT8-pBCj65ubL8aKRuOS7n78z1OX3_NaFspdYMuF7hz3d1cyZfltDAPd2pzIdLDdZEBjASYTXh7WZyDCc1EqsJL28In5qvnRjljANzxVcFOAqrTk-BOPQ-x5yL15KEFr7mR1ezsc6zqgfZhQRMH0Sccp8_JZMcoTziYG5pvToC8NamzwuPXepjpvaG_gW5Vo74R1D9WU';


const app_lwa_client_id = 'amzn1.application-oa2-client.114209b14a56401eaac802203eecc490';
const app_lwa_clinet_secret = 'f915e7b6994fd1291d2ce6b07e16519cc1ef9211361928c9a431bfcdca3130c1';

const AWS_USER_ID = 'AKIAX6QZFBKCMXZAWBL5';
const AWS_SECRET_ACCESS_KEY = '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';
const ROLE = 'arn:aws:iam::546587347588:role/test-role';


//AWS_ACCESS_KEY_ID: 'AKIAIP46V4PHJL34NJFA',
//AWS_SECRET_ACCESS_KEY: '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',


///////////////

/*

app_id = 'amzn1.sp.solution.59ea7ce7-de48-4d91-8253-5b3fd3c0c8cb'
login url:
https://sellercentral.amazon.com/apps/authorize/consent?application_id=${app_id}&state=69&redirect_uri=https://gigaheap.com/auth&version=beta

POST https://api.amazon.com/auth/o2/token
{
"client_id": "${app_lwa_client_id}",
"client_secret": "f915e7b6994fd1291d2ce6b07e16519cc1ef9211361928c9a431bfcdca3130c1",
"grant_type": "authorization_code",
"code": "ANOlhJQCAEgoIcWVOdrS"
}

*/

///

const {
    Order,
    OrderItem,
} = require('../../models');

const {
    OrderStatusEnum,
} = require('../../models/constants');
  

const {
    getConfig,
    log,
    logJSON,
} = require('../../infra/utils')
  

module.exports = class AmazonOrders {

    async init(config) {
        this.Order = Order(getConfig(config, 'collection'));
        this.OrderItem = OrderItem(getConfig(config, 'collection'));
        this.amazonSellerAPI = new AmazonSellerAPI();
        this.amazonSellerAPI.init({
            region: 'na',
            refresh_token: refresh_token,
            credentials: {
                SELLING_PARTNER_APP_CLIENT_ID: app_lwa_client_id, // app
                SELLING_PARTNER_APP_CLIENT_SECRET: app_lwa_clinet_secret, // app
        
        
                AWS_ACCESS_KEY_ID: AWS_USER_ID,
                AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY,
                
                AWS_SELLING_PARTNER_ROLE: ROLE,
            }
        });
    }
  
    async run(config, param) {
        await log(this, `PARAM: ${param}`);
        switch (param) {
            case 'getOrders':
                await this.getOrders();    
                break;
            case 'getOrderItems':
                await this.getOrderItems();    
                break;
            default:
                break;
        }
    }

    async getOrders() {
        const getOrdersResult = await this.amazonSellerAPI.getOrders();

        for await (var order of getOrdersResult.Orders) {
            await this.Order.findOneAndUpdate(
                { AmazonOrderId: order.AmazonOrderId },
                order,
                { upsert: true }
            );
        }

        await log(this, `saved ${getOrdersResult.Orders.length} orders`);
    }


    async getOrderItems() {
        const order = await this.Order.findOne({ status: OrderStatusEnum.NEW })

        if (!order) return;

        const getOrderItemsResult = await this.amazonSellerAPI.getOrderItems(order.AmazonOrderId);

        for await (var orderItem of getOrderItemsResult.OrderItems) {
            await this.OrderItem.findOneAndUpdate(
                { OrderItemId: orderItem.OrderItemId },
                orderItem,
                { upsert: true }
            );
        }

        await log(this, `saved ${getOrderItemsResult.OrderItems.length} order items for ${order.AmazonOrderId}`);

        await this.Order.updateOne(order, { status: OrderStatusEnum.FETCHED });
    }
}