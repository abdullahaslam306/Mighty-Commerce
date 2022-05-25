const
    RepricerAPI = require('../../infra/repricer-api'),
    CSV = require('../../infra/csv'),
    headers = require('../../data/repricer-headers.json')

const {
    Repricer
} = require('../../models');

const COUNT_INTERVAL = 2500;
const DEV_LIMIT = 0;

const RepricerScanModel = require('../../models/repricer-scan');
const RepricerStat = require('../../models/repricer-stat');
const RepricerNameProfit = require('../../models/repricer-repricer_name-profit');
const RepricerHub = require('../../models/repricer-hub')


const
    tax_factor = 0.06,
    discount_factor = 0.75,
    p_fee_factor = 0.03,
    g_fee_factor = 0.03,
    amazon_fee = 0.85;


const {
    getConfig,
    log,
    logLn,
    resolveFullPath,
    getFileTimestamp,
    roundHalf,
    devLimit,
    toDecimal,
    out
} = require('../../infra/utils');
const { update } = require('../../react-admin/controllers');
 
module.exports = class RepricerAPIBOT {

    async init(config) {
        this.Repricer = Repricer(getConfig(config, 'collection'));
        this.RepricerScanModel = RepricerScanModel(getConfig(config, 'collection'));
        this.RepricerStat = RepricerStat(getConfig(config, 'collection'));
        this.RepricerNameProfit = RepricerNameProfit(getConfig(config, 'collection'));
        this.RepricerHub = RepricerHub(getConfig(config, 'collection'))

        this.repricerAPI = new RepricerAPI();
        this.repricerAPI.init({ 
            userName: getConfig(config, 'userName'),
            password: getConfig(config, 'password'),
            dir: getConfig(config, 'dir'),
            fileName: getConfig(config, 'fileNameInput'),
         });
    }
  
    async run(config, param, state) {
        this.canPostFile = getConfig(config, 'canPostFile', true);
        console.log('--------------Here in repricer ----------')
        if (this.canPostFile) {
            await log(this, 'file post enabled', this.canPostFile)
        } else {
            await log(this, 'file post disabled', this.canPostFile)
        }

        const useTestInputFile = getConfig(config, 'useFileNameInput', true);

        const testInputFile = useTestInputFile ? getConfig(config, 'testFileNameInput', true) : undefined;

        if (useTestInputFile) await log(this, "using test input file: " + testInputFile);

        this.testInputFile = testInputFile ? resolveFullPath(getConfig(config, 'dir'),testInputFile) : undefined;
        this.inputFile = resolveFullPath(getConfig(config, 'dir'), getFileTimestamp(getConfig(config, 'fileNameInput')));
        this.outputFileShort = getFileTimestamp(getConfig(config, 'fileNameOutput'))
        this.outputFile = resolveFullPath(getConfig(config, 'dir'), this.outputFileShort);

        this.repricerNameProfitDocs = await this.RepricerNameProfit.find({});

        await this.getFile();
        await log(this,"insertToScanList START")
        await this.insertToScanList();
        await log(this,"updateFromScanList START")
        await this.updateFromScanList();
        await this.postFile();
    }

    async getFile() {
        if (this.testInputFile) {
            this.inputFile = this.testInputFile;
        } else {
            await this.repricerAPI.getFile(this.inputFile);
        }

        await log(this, 'CSV read file start')
        const results = await CSV.read(this.inputFile);
        await log(this, 'CSV read file end')

        await this.Repricer.deleteMany({});

        let counter = 0;

        for await (var entry of results) {
            counter += 1;

            if (counter % COUNT_INTERVAL == 0) {
                out(counter == COUNT_INTERVAL ? `${counter}` : `,${counter}`);
            }

            await this.Repricer.create(entry);

            if (devLimit(DEV_LIMIT)) {
                break;
            }
        }

        logLn(" DONE insert CSV entries: " + results.length);
    }

    async postFile() {

        const values = await this.Repricer.find({}).lean();

        await CSV.write(this.outputFile, headers, values);

        await log(this, 'written CSV file: ' + this.outputFile);
    // for test change it to
        if (!this.testInputFile && this.canPostFile == true) {
            const a = await this.repricerAPI.postFile(this.outputFile);           
	console.log(a);
	await log(this, 'uploaded file.');
        } else {
            await log(this, 'file post disabled');
        }
    }

    async insertToScanList() {
        const repricerDocs = await this.Repricer.find({});
        const lastSeen = new Date();
        let counter = 0;

        for await (var repricerDoc of repricerDocs) {
             if (devLimit(DEV_LIMIT)) {
                break;
            }
            counter += 1;

            if (counter % COUNT_INTERVAL == 0) {
                out(counter == COUNT_INTERVAL ? `${counter}` : `,${counter}`);
            }

            const asin = repricerDoc.asin;
            await this.RepricerScanModel.findOneAndUpdate(
                { 
                    asin 
                },
                { 
                    asin,
                    lastSeen 
                },
                { 
                    upsert: true 
                }
            );
        }

        logLn(" DONE insertToScanList");
    }    

    calcPricesBase(unit_cost) {

        const unit_cost_total = 
            unit_cost * (tax_factor + 1) * discount_factor;

        const p_fee = unit_cost_total * p_fee_factor;
        const g_fee = unit_cost_total * g_fee_factor;

        const unit_cost_total_after_fees = 
            unit_cost_total + p_fee + g_fee;

        return unit_cost_total_after_fees;
    }


    calcPricesPercentage(unit_cost_total_after_fees, profit_percentage = 0.15) {
        return {
            price_max: unit_cost_total_after_fees * 3,
            price_min: unit_cost_total_after_fees / (amazon_fee - profit_percentage)
        }        
    }

    calcPricesFixedMargin(unit_cost_total_after_fees, profit_percentage_usd = 0) {
        return {
            price_max: unit_cost_total_after_fees * 3,
            price_min: (unit_cost_total_after_fees + profit_percentage_usd) / amazon_fee
        }        
    }

    async updateRepricer(repricerDoc, updatedPrice) {
        if (updatedPrice) {

            repricerDoc.unit_cost = updatedPrice;

            const repricerNameProfitDoc = 
                this.repricerNameProfitDocs.find(
                    doc => doc.repricer_name == repricerDoc.repricer_name);
            if (repricerNameProfitDoc != undefined && repricerNameProfitDoc.process == true) {
                const unit_cost_total_after_fees = this.calcPricesBase(updatedPrice);

                const { 
                    price_max,
                    price_min
                } = this.calcPricesPercentage(unit_cost_total_after_fees, repricerNameProfitDoc ? repricerNameProfitDoc.profit : undefined);

                repricerDoc.price_max = price_max;
                repricerDoc.price_min = price_min;
        }
        }
        repricerDoc.price_max = roundHalf(repricerDoc.price_max.toFixed(2));
        repricerDoc.price_min = roundHalf(repricerDoc.price_min.toFixed(2));

        await repricerDoc.save();
    }

    async updateFromScanList() {
        const repricerDocs = await this.Repricer.find({});

        let counter = 0;

        for await (var repricerDoc of repricerDocs) {
            counter += 1;

            if (counter % COUNT_INTERVAL == 0) {
                out(counter == COUNT_INTERVAL ? `${counter}` : `,${counter}`);
            }

            
            const agregateArray = await this.RepricerHub.aggregate([
        { $match: { "asin": repricerDoc.asin } },
        { $sort:{ "lastUpdate": - 1} },
        { "$group" : {
        _id:"$asin",
            price: { $first: '$price' },
            shipping: { $first: '$shipping' },
            quantity: { $first: '$quantity' },
        }}
      ])

      const priceScanDoc =  agregateArray[0];

            if (!priceScanDoc) {
                await this.updateRepricer(repricerDoc)
                continue;
            }

           

            const updatedPrice = toDecimal(priceScanDoc.price) + toDecimal(priceScanDoc.shipping);


            if (!updatedPrice) {
                await this.updateRepricer(repricerDoc);
                continue;
            }

            await this.updateRepricer(repricerDoc, updatedPrice);
        }

        logLn(" DONE updateFromScanList");
    }
}
