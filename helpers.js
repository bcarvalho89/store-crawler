const fs = require('fs');
const exportsDir = './exports';

function writeFile(fileName, data) {
  if (!fs.existsSync(exportsDir)){
    fs.mkdirSync(exportsDir);
  }

  fs.writeFile(
    `./exports/${fileName}.json`,
    JSON.stringify(data, null, 2),
    (err => {
      if (err) {
        console.log(`Error in write ${fileName} file`, err);
        process.exit();
      } else {
        console.log(`${fileName} exported!`);
      }
    })
  );
}


exports.writeFile = writeFile;