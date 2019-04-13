const fs = require('fs');
const converter = require('json-2-csv');
const exportsDir = './exports';

function writeFile(filename, data) {
  if (!fs.existsSync(exportsDir)){
    fs.mkdirSync(exportsDir);
  }

  fs.writeFile(
    `./exports/${filename}`,
    data,
    (err => {
      if (err) {
        console.log(`Error in write ${filename} file`, err);
        process.exit();
      } else {
        console.log(`${filename} exported!`);
      }
    })
  );
}

function writeCSV(filename, data) {
  let json2csvCallback = function(err, csv) {
    if (err) throw err;

    writeFile(filename, csv);
  }

  converter.json2csv(data, json2csvCallback, { excelBOM: true });
}

function prepareCategoriesToExport(filename, categories) {
  const allCategories = [];
  
  for (let category of categories) {
    const categoryData = category.subcategories.map(item => ({ subcategory: item.name, category: category.name }));
    allCategories.push(...categoryData);
  }

  writeCSV(filename, allCategories);
}

exports.writeFile = writeFile;
exports.writeCSV = writeCSV;
exports.prepareCategoriesToExport = prepareCategoriesToExport;