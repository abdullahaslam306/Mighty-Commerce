const Track17 = require('../../infra/track17')
const TrackingNumberHelpers = require('../../models/helpers/tracking-number');

const COUNT_INTERVAL = 2500;

const {
  TrackingNumber
} = require('../../models');

const {
  getConfig,
  log,
  out,
  logLn
} = require('../../infra/utils')

module.exports = class TrackingRegistration {

  async init(config) {
    this.track17 = new Track17();
    this.track17.init({ token: getConfig(config, 'token') });
  }

  async scanDB() {
    this.notFound = [];

    const db = await this.TrackingNumber1.find({});

    let counter = 0;
    for await (var doc of db) {
      counter += 1;

      if (counter % COUNT_INTERVAL == 0) {
        out(counter == COUNT_INTERVAL ? `${counter}` : `,${counter}`);
      }

      const remoteEntryExists = this.registered.find(x => x.number == doc.number); // && x.carrier == doc.carrier);
      const registrationStatus = remoteEntryExists ? 'registered' : 'non-registered';
      doc.registrationStatus = registrationStatus;
      await doc.save();
    }

    logLn(" DONE update registrationStatus: " + db.length);

    for await (var entry of this.registered) {
      if (!await this.TrackingNumber1.exists(entry))
        this.notFound.push(entry);      
    }

    const deliveredStatus = TrackingNumberHelpers.getTrackingStatusDelivered();

    this.deliveredToRemove = 
      TrackingNumberHelpers.fromRawFiltered(
        await this.TrackingNumber1.find({ 
          registrationStatus: 'registered', 
          status: deliveredStatus 
        }));

    this.undeliveredToRegister = 
      TrackingNumberHelpers.fromRawFiltered(
        await this.TrackingNumber1.find({ 
          registrationStatus: 'non-registered', 
          status: { $ne: deliveredStatus }
        }));

    const total = await this.TrackingNumber1.count({  });
    const registered = await this.TrackingNumber1.count({ registrationStatus: 'registered' });
    const nonRegistered = await this.TrackingNumber1.count({ registrationStatus: 'non-registered' });
    
    await log(this, `notFound(${this.notFound.length}) deliveredToRemove(${this.deliveredToRemove.length}) total(${total}) registered(${registered}) nonRegistered(${nonRegistered})`);
  }

  async unregister() {
    var toRemove = [];

    for (var entry of this.notFound) toRemove.push(entry);
    for (var entry of this.deliveredToRemove) toRemove.push(entry);

    if (toRemove.length) {
      await log(this, `unregister: toRemove(${toRemove.length})`);
      const result = await this.track17.register(toRemove, { stop: true });
      
      for await (var item of result.accepted) {
        try {
          await this.TrackingNumber1.updateOne({ number: item.number }, { registrationStatus: 'unregistered' });
        } catch (e) {
          console.error(e);
        }
      }

      for await (var item of result.rejected) {
        try {
          await this.TrackingNumber1.updateOne({ number: item.number }, { registrationStatus: 'unregister-rejected', registrationError: item.error });
        } catch (e) {
          console.error(e);
        }
      }

      for await (var item of result.errors) {
        try {
          await this.TrackingNumber1.updateOne({ number: item.number }, { registrationStatus: 'unregister-error', registrationError: item.error });
        } catch (e) {
          console.error(e);
        }
      }

      await log(this, `unregister: accepted(${result.accepted.length}), rejected(${result.rejected.length}), errors(${result.errors.length})`);
    }
  }

  async register() { 
    if (this.undeliveredToRegister.length) {
      await log(this, `register: undeliveredToRegister(${this.undeliveredToRegister.length})`);
      const result = await this.track17.register(this.undeliveredToRegister);

      for await (var item of result.accepted) {
        try {
          await this.TrackingNumber1.updateOne({ number: item.number }, { registrationStatus: 'registered' });
        } catch (e) {
          console.error(e);
        }
      }

      for await (var item of result.rejected) {
        try {
          await this.TrackingNumber1.updateOne({ number: item.number }, { registrationStatus: 'register-rejected', registrationError: item.error });
        } catch (e) {
          console.error(e);
        }
      }

      for await (var item of result.errors) {
        try {
          await this.TrackingNumber1.updateOne({ number: item.number }, { registrationStatus: 'register-error', registrationError: item.error });
        } catch (e) {
          console.error(e);
        }
      }

      await log(this, `register: accepted(${result.accepted.length}), rejected(${result.rejected.length}), errors(${result.errors.length})`);
    }
  }

  async markToScan() {
    const deliveredStatus = TrackingNumberHelpers.getTrackingStatusDelivered();

    const { modifiedCount } = await this.TrackingNumber1.updateMany(
        { registrationStatus: 'registered', status: { $ne: deliveredStatus }},
        { toScanStatus: true }
      )

    const toScanStatus = await this.TrackingNumber1.count({ toScanStatus: true });
    const nonToScanStatus = await this.TrackingNumber1.count({ toScanStatus: false });

    await log(this, `markedToScan: ${modifiedCount} toScanStatus(${toScanStatus}) nonToScanStatus(${nonToScanStatus})`);
  }

  async run(config) {
    this.TrackingNumber1 = TrackingNumber(config.collection);
    this.registered = await this.track17.getRegisteredList();
    await log(this, `registered(${this.registered.length})`);

    await this.scanDB();
    await this.unregister();
    await this.register();
    await this.markToScan();
  }
}