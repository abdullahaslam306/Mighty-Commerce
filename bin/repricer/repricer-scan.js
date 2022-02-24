const EbayScraping = require('../../infra/ebay-scrape');
const validUrl = require('valid-url');
    
const RepricerScanModel = require('../../models/repricer-scan');
const RepricerASINSource = require('../../models/repricer-asin-source');

const { RepricerScanEnum } = require('../../models/constants');

const {
    getConfig,
    log,
    toDecimal,
} = require('../../infra/utils')
 
module.exports = class RepricerScan {

    async init(config) {
        this.RepricerScanModel = RepricerScanModel(getConfig(config, 'collection'));
        this.RepricerASINSource = RepricerASINSource(getConfig(config, 'collection'));
    }
  
    async run(config) {
        const lastScanSecs = getConfig(config, 'lastScanSecs') * 1000;
        const lastSeenHours = getConfig(config, 'lastSeenHours') * 1000 * 60 * 60;
        
        const repricerScans = 
            await this.RepricerScanModel
                .find({
                    lastSeen: {
                        $gt: new Date(new Date().getTime() - lastSeenHours)
                    },
                    $or: [
                        {
                            lastScan: null
                        }, {
                            lastScan: {
                                $lt: new Date(new Date().getTime() - lastScanSecs)
                            }
                        }
                    ]
                })
                .sort({"lastScan": 1})
                .limit(1);

        let repricerScan;

        if (!repricerScans.length) {
            return;
        }

        repricerScan = repricerScans[0];

        const repricerASINSource = await this.RepricerASINSource.findOne({
            ASIN: repricerScan.asin
        });

        repricerScan.fetchStatusErrorCode = null;

        if (!repricerASINSource) {
            repricerScan.status = RepricerScanEnum.NO_URL;
        } else if (repricerASINSource.hasVariations) {
            repricerScan.hasSourceVariations = true;
            repricerScan.status = RepricerScanEnum.BYPASSED;
        } else {
            repricerScan.hasSourceVariations = false;
            const url = repricerASINSource.source;

            repricerScan.url = url;
            
            if (!validUrl.isUri(url)){
                repricerScan.status = RepricerScanEnum.INVALID_URL;
            } else {
                try {
                    const { remainQty, price, shippingPrice, hasVariations } = await EbayScraping.scrape(url);

                    repricerScan.remainQty = toDecimal(remainQty);
                    repricerScan.price = toDecimal(price);
                    repricerScan.shippingPrice = toDecimal(shippingPrice);
                    repricerScan.hasVariations = hasVariations;

                    repricerScan.status = RepricerScanEnum.FETCHED;
                } catch (e) {
                    repricerScan.status = RepricerScanEnum.ERROR;
                    repricerScan.fetchStatusErrorCode = e.statusCode;
                }
            }
        }

        repricerScan.lastScan = new Date();

        await repricerScan.save();
    }
}