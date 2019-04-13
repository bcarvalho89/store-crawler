'use strict';
const puppeteer = require('puppeteer');
const semver = require('semver');
const engines = require('./package').engines;
const nodeVersion = engines.node;
const moment = require('moment');
const { prepareCategoriesToExport, writeCSV } = require('./helpers');

const BASE_URL = 'https://www.petropolis.bramilemcasa.com.br/';
const startDate = moment.now();
const SKIP_UNAVAILABLE = true;

if (!semver.minVersion(nodeVersion)) {
  console.log(`NodeJS Version Check: Required node version ${nodeVersion} NOT SATISFIED with current version ${process.version}.`);
  process.exit(1);
}

async function extractProductDetail(page, SKIP_UNAVAILABLE, category) {
  const selector = SKIP_UNAVAILABLE ? `.vip-products .product .thumbnail:not(.produto-indisponivel) .description:nth-child(1) a` : '.vip-products .product div .description:nth-child(1) a';

  return page.evaluate((selector, category) => {
    let productsHolder = [];

    document.querySelectorAll(selector).forEach(product => {
      let productJson = {};
      try {
        productJson.name = product.getAttribute('title');
        productJson.url = product.getAttribute('href');
        productJson.category =category;
      } catch (error) {
        console.log(error);
      }
      productsHolder.push(productJson);
    });
    return productsHolder;
  }, selector, category);
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 926 });
  await page.setRequestInterception(true);
  
  page.on('request', (req) => {
    if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
      req.abort();
    } else {
      req.continue();
    }
  });
  
  await page.goto(BASE_URL);
  await page.waitFor(1500);

  // Search for categories
  console.log('Searching for categories...');
  let categoriesData = await page.evaluate(() => {
    let categories = [];

    document.querySelectorAll('#departamentos ul li a').forEach(category => {
      let categoryJson = {};
      try {
        categoryJson.name = category.lastElementChild.innerHTML;
        categoryJson.url = category.href;
      } catch (error) {
        console.log(error);
      }
      categories.push(categoryJson);
    });

    return categories;
  });

  // Search for subcategories
  console.log('Searching for subcategories...');
  let subcategories = []; 
  // for (let category of categoriesData) {
    for (let i = 0; i < 2; i++) {
      let category = categoriesData[i];
    console.log(`Visiting category: ${category.name}`);

    await page.goto(category.url);
    await page.waitFor(1500);

    let subcategoryData = await page.evaluate((category) => {
      let subcategoriesHolder = {
        name: category.name,
        subcategories: []
      };

      document.querySelectorAll('.vip-categories .category .caption a').forEach(subcategory => {
        let subcategoryJson = {}; 
        try {
          subcategoryJson.name = subcategory.title;
          subcategoryJson.url = subcategory.href;
        } catch (error) {
          console.log(error);
        }
        subcategoriesHolder.subcategories.push(subcategoryJson);
      });

      return subcategoriesHolder;
    }, category);

    subcategories.push(subcategoryData);
  }

  prepareCategoriesToExport('categories.csv', subcategories);

  // Search for products
  console.log('Searching for products...');
  let products = [];
  // for (let category of subcategories) {
  for (let i = 0; i < 1; i++) {
    let category = subcategories[i];
    // for (let subcategory of category.subcategories) {
    for (let j = 0; j < 1; j++) {
      let subcategory = category.subcategories[j];
      let currentPage = 1;

      console.log(`Visiting subcategory: ${subcategory.name}`);

      await page.goto(subcategory.url);
      await page.waitFor(1500);

      let totalPages = await page.evaluate(() => {
        let text = document.querySelector('.pagination').nextElementSibling.innerHTML.trim();
        return parseInt(text.split(',')[0].split('de ')[1]);
      });

      while (currentPage <= totalPages) {
        let newUrls = await extractProductDetail(page, SKIP_UNAVAILABLE, subcategory.name);
        products = products.concat(newUrls);

        if (currentPage < totalPages) {
          await page.goto(subcategory.url + '?page=' + (currentPage + 1));
          await page.waitFor(1500)
        }
        currentPage++;
      }
    }
  }

  // Get product details
  console.log('Getting products detail');
  const allProducts = [];
  for (let product of products) {
  // for (let i = 0; i < 2; i++) {
  //   const product = products[i];
    console.log(`Visiting product: ${product.name}`);

    await page.goto(BASE_URL + product.url);
    await page.waitFor(1500);

    let productDetailData = await page.evaluate((product) => {
      return productDetailJson = {
        name: product.name,
        value: parseFloat(document.querySelector('#product .info-price').innerHTML.split('<')[0].split('R$ ')[1].replace(',', '.')) || null,
        image: document.querySelector('#product .img-link img').src || null,
        description: document.querySelector('#product .description').textContent.trim() || null
      };
    }, product);

    allProducts.push(productDetailData);
  }

  writeCSV('products.csv', allProducts);
  
  const endDate = moment.now();
  const diff = moment(endDate).diff(moment(startDate), 'minutes', true);

  console.log('Crawling finished!');
  console.log(`Products exported: ${allProducts.length}`);
  console.log(`Time lapse: ${Math.round(diff * 100) / 100} minutes`);
  
  browser.close();
})();