const fs = require("fs"),
      csvParser = require("csv-parser"),
      createCSV = require('csv-writer').createObjectCsvWriter;

module.exports = class CSV {

    static read(path) {
        return new Promise((resolve, reject) => {
            var results = [];

            try {
            fs
                .createReadStream(path)
                .pipe(csvParser())
                .on("data", data => results.push(data))
                .on("end", _ => resolve(results));
            } catch(e) {
                reject(`csv read error: ${e.message}`);
            }
        })
    }
    
    static write(path, headers, values) {
        const header = headers.map(header => { 
            return { id: header, title: header }
        });

        return createCSV({
            path,
            header
        }).writeRecords(values) // is a promise
    }
}







var results = [];



function write(results1) {
    const header = Object.keys(results1[0]).map(header => { return { id: header, title: header }});

    const _createCSV = createCSV({
        path: "data_out2.csv",
        header
      });

console.log(results1)
   // _createCSV.writeRecords(results1)
    .then(() => { console.log("Write done"); });
}

