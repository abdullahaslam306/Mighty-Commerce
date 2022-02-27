const OrderStatusEnum = {
    NEW: 'NEW',
    FETCHED: 'FETCHED'
}
  
const RepricerScanEnum = {
    NEW: 'NEW',
    FETCHED: 'FETCHED',
    ERROR: 'ERROR',
    INVALID_URL: 'INVALID_URL',
    NO_URL: 'NO_URL',
    BYPASSED: 'BYPASSED'
}

module.exports = {
    OrderStatusEnum,
    RepricerScanEnum,
}
