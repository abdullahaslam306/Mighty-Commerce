const rp = require('request-promise');
const cheerio = require('cheerio');


module.exports = class EbayScraping {

  static hasVariations(dom) {
    const selectCount = dom("div.vi-msku-cntr select.msku-sel").length;
    return selectCount > 0;
  }    

  static getShippingPrice(dom) {
    const el = dom('span#fshippingCost>span:first-child').eq(0);
    const text = el ? el.text().trim() : '';
    const number = text.match(/\d+.\d*/);
    return number ? number[0] : undefined;
  }

  static getRemainQty(html) {
    const KEY_WORD = "remainQty"
    const startIndex = html.indexOf(KEY_WORD) + KEY_WORD.length
    const text = html.substring(startIndex,startIndex+10)
    const number = text.match(/\d+/);
    return number ? number[0] : undefined;
  }

  static getPrice(html) {
    const KEY_WORD = '\"binPrice\":\"';
    var startIndex = html.indexOf(KEY_WORD) + KEY_WORD.length
    var text = html.substring(startIndex, startIndex+15)
    const number = text.match(/\d+.\d*/);
    return number ? number[0] : undefined;
  }

  static scrape(url) {
    return rp(url)
      .then(html => {
        const dom = cheerio.load(html);

        return {
          remainQty: EbayScraping.getRemainQty(html), 
          price: EbayScraping.getPrice(html),
          shippingPrice: EbayScraping.getShippingPrice(dom),
          hasVariations: EbayScraping.hasVariations(dom),
        }
      })
      .catch()
  }
}
