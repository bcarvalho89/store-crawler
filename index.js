'use strict';
const puppeteer = require('puppeteer');
const semver = require('semver');
const engines = require('./package').engines;
const nodeVersion = engines.node;
const moment = require('moment');
const { writeFile } = require('./helpers');

const BASE_URL = 'http://books.toscrape.com/';
const startDate = moment.now();

if (!semver.minVersion(nodeVersion)) {
  console.log(`NodeJS Version Check: Required node version ${nodeVersion} NOT SATISFIED with current version ${process.version}.`);
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE_URL);

  // Search for categories
  console.log('Searching for categories...');
  let categoriesData = await page.evaluate(() => {
    let categories = [];

    document.querySelectorAll('.side_categories ul ul a').forEach(category => {
      let categoryJson = {};

      try {
        categoryJson.name = category.textContent.trim();
        categoryJson.url = category.getAttribute('href');
      } catch (error) {
        console.log(error);
      }
      categories.push(categoryJson);
    });

    return categories;
  });
  writeFile('Categories', categoriesData);

  // Search for products
  console.log('Searching for products...');
  let products = []; 
  for (let category of categoriesData) {
    console.log(`Visiting category: ${category.name}`);

    await page.goto(BASE_URL + category.url);

    let productData = await page.evaluate(() => {
      let productJson = {};  
      document.querySelectorAll('article.product_pod').forEach(product => {
        try {
          productJson.name = product.children[2].firstElementChild.getAttribute('title');
          productJson.image = product.firstElementChild.firstElementChild.firstElementChild.src;
          productJson.value = parseFloat(product.lastElementChild.firstElementChild.innerHTML.split('£')[1]);
        } catch (error) {
          console.log(error);
        }
      });
      return productJson;
    });

    products.push(productData);
  }
  writeFile('Products', products);
  
  const endDate = moment.now();
  const diff = moment(endDate).diff(moment(startDate), 'minutes', true);

  console.log('Crawling finished!');
  console.log(`Time lapse: ${Math.round(diff * 100) / 100} minutes`);
  
  browser.close();
})();