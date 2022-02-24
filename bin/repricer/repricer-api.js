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

const { RepricerScanEnum } = require('../../models/constants');

const
    tax_factor = 0.09,
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

        if (this.canPostFile) {
            await log(this, 'file post enabled')
        } else {
            await log(this, 'file post disabled')
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

        if (!this.testInputFile && this.canPostFile == true) {
            await this.repricerAPI.postFile(this.outputFile);
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
            price_max: unit_cost_total_after_fees * 8,
            price_min: unit_cost_total_after_fees / (amazon_fee - profit_percentage)
        }        
    }

    calcPricesFixedMargin(unit_cost_total_after_fees, profit_percentage_usd = 0) {
        return {
            price_max: unit_cost_total_after_fees * 8,
            price_min: (unit_cost_total_after_fees + profit_percentage_usd) / amazon_fee
        }        
    }

    async updateRepricer(repricerDoc, updatedPrice) {
        if (updatedPrice) {
            repricerDoc.unit_cost = updatedPrice;

            const repricerNameProfitDoc = 
                this.repricerNameProfitDocs.find(
                    doc => doc.repricer_name == repricerDoc.repricer_name);
            
            if (!repricerNameProfitDoc || repricerNameProfitDoc.process) {
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
        const repricerStat = new this.RepricerStat();

        repricerStat.scanTime = new Date();
        repricerStat.total = 0;
        repricerStat.newState = 0;
        repricerStat.fetchedState = 0;
        repricerStat.errorState = 0;
        repricerStat.bypassedState = 0;
        repricerStat.otherState = 0;
        repricerStat.modified = 0;
        repricerStat.zeroPrice = 0;
        repricerStat.hasVariations = 0;
        repricerStat.hasSourceVariations = 0;
        repricerStat.scanMissing = 0;
        repricerStat.fileName = this.outputFileShort;

        repricerStat.nanPrice = 0;
        repricerStat.debugSkipped = 0;

        let counter = 0;

        for await (var repricerDoc of repricerDocs) {
            counter += 1;

            if (counter % COUNT_INTERVAL == 0) {
                out(counter == COUNT_INTERVAL ? `${counter}` : `,${counter}`);
            }

            repricerStat.total += 1;

            const priceScanDoc = await this.RepricerScanModel.findOne({ asin: repricerDoc.asin});

            if (!priceScanDoc) {
                repricerStat.scanMissing += 1;
                await this.updateRepricer(repricerDoc)
                continue;
            }

            if (priceScanDoc.hasSourceVariations) {
                repricerStat.hasSourceVariations += 1;
                await this.updateRepricer(repricerDoc)
                continue;
            }

            switch (priceScanDoc.status) {
                case RepricerScanEnum.NEW:
                    repricerStat.newState += 1;
                    break;
                case RepricerScanEnum.FETCHED:
                    repricerStat.fetchedState += 1;
                    break;
                case RepricerScanEnum.ERROR:
                    repricerStat.errorState += 1;
                    break;
                case RepricerScanEnum.BYPASSED:
                    repricerStat.bypassedState += 1;
                    break;
                default:
                    repricerStat.otherState += 1;
                    break;                    
            }

            if (priceScanDoc.hasVariations) {
                repricerStat.hasVariations += 1;
            } else if (toDecimal(priceScanDoc.price) + toDecimal(priceScanDoc.shippingPrice) == 0) {
                repricerStat.zeroPrice += 1;
            }

            const updatedPrice = 
                priceScanDoc.hasVariations ? 0 :
                    toDecimal(priceScanDoc.price) + toDecimal(priceScanDoc.shippingPrice);

            // if (isNaN(unit_cost)) {
            //     repricerStat.nanPrice += 1;
            // }

            if (!updatedPrice) {
                await this.updateRepricer(repricerDoc);
                repricerStat.debugSkipped += 1;
                continue;
            }

            await this.updateRepricer(repricerDoc, updatedPrice);

            repricerStat.modified += 1;
        }

        logLn(" DONE updateFromScanList");

        //await log(this, repricerStat);

        await repricerStat.save();
    }
}