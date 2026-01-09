const data = require('./debug_daevanion.json');

console.log('Top level keys:', Object.keys(data));
console.log('\nfull_info_sample keys:', Object.keys(data.full_info_sample || {}));
