const SmeeClient = require('smee-client')

module.exports = WebHook

function WebHook() {
}

WebHook.prototype.init = () => {
    const smee = new SmeeClient({
        source: 'https://smee.io/fBaBTUJ0MYvmtVO',
        target: 'http://localhost:3001/events',
        logger: console
    })

    const events = smee.start()

    // Stop forwarding events
    //events.close()
}