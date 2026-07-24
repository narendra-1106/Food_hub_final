const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../DYPIU_Nearby_Restaurants_Menu.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets['Restaurants'];
const data = xlsx.utils.sheet_to_json(sheet);

console.log('Total restaurants:', data.length);
console.log('\nAll restaurant names:');
data.forEach((row, i) => {
  console.log(`${i+1}. ${row['Restaurant Name']}`);
});

console.log('\nSample full row:');
console.log(JSON.stringify(data[0], null, 2));
