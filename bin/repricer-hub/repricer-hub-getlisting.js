const RepricerHubAPI = require('../../infra/repricerhub-api')

const {
    RepricerHub
} = require('../../models');

const {
    getConfig,
    log,
    logLn,
    logError,
} = require('../../infra/utils');

module.exports = class RepricerHubGetListing {

    async init(config) {
        this.RepricerHub = RepricerHub(getConfig(config, 'collection'));
        this.apiKey = getConfig(config, 'apiKey');
        this.repricerHubAPI = new RepricerHubAPI(this.apiKey);
    }
  
    async run(config, param, state) {
        await this.getListings();
    }

    async getListings() {
        await log(this, `getListing started`);
        try {
            const result = await this.repricerHubAPI.getListings();

            await log(this, `getListing got ${result.data.listings.length} entries`);

            const data = result.data;
            const sellerId = data.sellerId;
            let counter = 0;
            const lastUpdate = new Date();

            await log(this, `updating started`);

            for await (var listing of data.listings) {
                if (!listing.suppliers.length) continue;
                
                await this.RepricerHub.findOneAndUpdate(
                    {
                        sellerId,
                        asin: listing.asin,
                    },
                    { 
                        price: listing.suppliers[0].price,
                        shipping: listing.suppliers[0].shipping,
                        quantity: listing.suppliers[0].quantity,
                        lastUpdate
                    },
                    {
                      upsert: true
                    });
            
                counter += 1;
            }

            await log(this, `getListing saved ${counter} entries`);
        } catch (e) {
            if (e.response && e.response.status == 401) {
                await logError(this, 'getListings bad api-key', this.apiKey);
            } else {
                await logError(this, 'getListings', '', e);
            }
        }
    }
}