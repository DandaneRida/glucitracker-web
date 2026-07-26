const fs = require('fs');
const data = fs.readFileSync('data/ciqual-complete.json', 'utf8');
fs.writeFileSync('data/ciqual-complete.js', 'window.CIQUAL_DATA = ' + data + ';');
console.log('Done converting JSON to JS.');
