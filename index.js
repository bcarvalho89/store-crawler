'use strict';
const puppeteer = require('puppeteer');
const semver = require('semver');
const engines = require('./package').engines;
const nodeVersion = engines.node;
const fs = require('fs');
const moment = require('moment');

const BASE_URL = 'http://books.toscrape.com/';
const startDate = moment.now();

if (!semver.minVersion(nodeVersion)) {
  console.log(`NodeJS Version Check: Required node version ${nodeVersion} NOT SATISFIED with current version ${process.version}.`);
  process.exit(1);
}

let scrape = async () => {
  const browser = await puppeteer.launch({headless: true});
  let page = await browser.newPage();
  await page.goto(BASE_URL);

  console.log('Searching for categories...');
  const result = await page.evaluate(() => {
    const categories = [];

    document.querySelectorAll('.side_categories ul ul a').forEach(category => {
      const categoryObj = {
        name: category.textContent.trim(),
        url: category.getAttribute('href')
      };

      categories.push(categoryObj);
    });

    return categories;
  });

  browser.close();
  return result;
};

let fetchCategories = async (categories) => {
  const allCategoriesIntro = [];

  for (let i = 0; i < 2; i++) {
    const category = categories[i];

    console.log(`Visiting category: ${category.name}`);
    const browser = await puppeteer.launch({headless: true});
    let page = await browser.newPage();
    await page.waitFor(200);

    await page.goto(BASE_URL + category.url);
    
    const result = await page.evaluate(() => {
      return 'Category: ' + document.querySelector('.page-header h1').textContent;
    });
    
    allCategoriesIntro.push(result);
    page.close();
  }

  return allCategoriesIntro;
}

scrape()
  .then((value) => {
    writeFile('Categories', value);

    fetchCategories(value)
      .then((allCats) => {
        writeFile('AllCats', allCats);

        const endDate = moment.now();
        const diff = moment(endDate).diff(moment(startDate), 'minutes', true);

        console.log(`Time lapse: ${Math.round(diff * 100) / 100} minutes`);
        process.exit();
      })
      .catch(error => {
        console.log(error);
      })
  })
  .catch(error => {
    console.log(error);
  });


function writeFile(fileName, data) {
  console.log(data);
  fs.writeFile(
    `./exports/${fileName}.json`,
    JSON.stringify(data, null, 2),
    (err => err ? console.log(`Error in write ${fileName} file`, err) : console.log(`${fileName} exported!`))
  );
}