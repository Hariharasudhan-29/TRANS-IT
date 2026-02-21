const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('Daily Bus Routes From 16.02.2026 (1).pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('extracted_pdf.txt', data.text);
    console.log('PDF extracted successfully to extracted_pdf.txt');
}).catch(function (error) {
    console.error(error);
});
