const carrierInfo = require('../../data/carrier-info.json')
const trackingStatuses = require('../../data/tracking-statuses.json')

const HEADER_COUNT = 1;

function trim(value) {
  return value ? value.trim() : undefined;
}

function fromGoogleSheetsValues(arr) {
  return arr.map((values,i) => { return {
      number: trim(values[0]),
      carrierRaw: trim(values[1]),
      carrier: resolveCarrier(values[1]),
      index: i+1+HEADER_COUNT
    }});//.filter(value => value.number);
}

function fromGoogleSheetsValuesForStatus(arr) {
  return arr.map((values,i) => { return {
      statusInternal: trim(values[0]),
      index: i+1+HEADER_COUNT
    }});//.filter(value => value.number);
}

function fromRawFiltered(arr) {
  return arr.map(x => {
    return {
      carrier: parseInt(x.carrier) ? x.carrier : undefined,
      number: x.number && x.number.length ? x.number : undefined,
    }
  }).filter(x => x.carrier && x.number);
}

function getTrackingStatusDesc(status) {
  return trackingStatuses[status.toString()]
}

function getTrackingStatusDelivered() {
  return 40;
}

function maxIndex(arr) {
  return Math.max(...arr.map(x => x.index));
}

function resolveCarrier(carrier) {
  if (!carrier)
    return undefined;
    
  const carrierEntry = 
    carrierInfo
    .find(d => d._name.trim().toLowerCase() == carrier.trim().toLowerCase().split(' ')[0]);

  return carrierEntry ? carrierEntry.key : undefined;
}

module.exports = {
  fromGoogleSheetsValues,
  fromGoogleSheetsValuesForStatus,
  resolveCarrier,
  maxIndex,
  getTrackingStatusDesc,
  getTrackingStatusDelivered,
  fromRawFiltered,
}