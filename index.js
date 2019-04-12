'use strict';
const puppeteer = require('puppeteer');
const semver = require('semver');
const engines = require('./package').engines;
const nodeVersion = engines.node;
const moment = require('moment');
const { writeFile } = require('./helpers');

const BASE_URL = 'https://www.petropolis.bramilemcasa.com.br/';
const startDate = moment.now();

if (!semver.minVersion(nodeVersion)) {
  console.log(`NodeJS Version Check: Required node version ${nodeVersion} NOT SATISFIED with current version ${process.version}.`);
  process.exit(1);
}

async function extractedEvaluateCall(page) {
  return page.evaluate(() => {
    let productsHolder = [];
    document.querySelectorAll('.vip-products .product .description:nth-child(1) a').forEach(product => {
      let productJson = {};
      try {
        productJson.name = product.getAttribute('title');
      } catch (error) {
        console.log(error);
      }
      productsHolder.push(productJson);
    });
    return productsHolder;
  });
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
  await page.waitFor(1000);

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

  // console.log(categoriesData);
  // writeFile('Categories', categoriesData);

  // Search for subcategories
  console.log('Searching for subcategories...');
  let subcategories = []; 
  // for (let category of categoriesData) {
    for (let i = 0; i < 1; i++) {
      let category = categoriesData[i];
    console.log(`Visiting category: ${category.name}`);

    await page.goto(category.url);
    await page.waitFor(3000);

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

  // console.log(subcategories[0].subcategories); SAVE ON FILE


  // Search for products
  console.log('Searching for products...');
  let products = [];
  // for (let category of subcategories) {
  for (let i = 0; i < 1; i++) {
    let category = subcategories[i];
    // for (let subcategory of category.subcategories) {
    for (let j = 0; i < 1; i++) {
      let subcategory = category.subcategories[j];
      let currentPage = 1;
      console.log(`Visiting subcategory: ${subcategory.name}`);

      await page.goto(subcategory.url);
      await page.waitFor(1500);

      let totalPages = await page.evaluate(() => {
        let text = document.querySelector('.pagination').nextElementSibling.innerHTML.trim();
        // return parseInt(text.split(',')[0].split('de ')[1]);
        return 2
      });


      while (currentPage <= totalPages) {
        let newUrls = await extractedEvaluateCall(page);
        products = products.concat(newUrls);

        if (currentPage < totalPages) {
          await page.goto(subcategory.url + '?page=' + (currentPage + 1));
          await page.waitFor(1500)
        }
        currentPage++;
      }
    }
  }
  console.log(products);
  // for (let subcategory of subcategories[0].subcategories) {
  //   console.log(`Visiting subcategory: ${subcategory.name}`);



    // await page.goto(BASE_URL + category.url);
    // await page.waitFor(3000);
    // await page.screenshot({ path: 'example.png' });

    // let productData = await page.evaluate(() => {
    //   let productJson = {};  
    //   document.querySelectorAll('article.product_pod').forEach(product => {
    //     try {
    //       productJson.name = product.children[2].firstElementChild.getAttribute('title');
    //       productJson.image = product.firstElementChild.firstElementChild.firstElementChild.src;
    //       productJson.value = parseFloat(product.lastElementChild.firstElementChild.innerHTML.split('£')[1]);
    //     } catch (error) {
    //       console.log(error);
    //     }
    //   });
    //   return productJson;
    // });

    // products.push(productData);
  // }
  // writeFile('Products', products);
  
  // const endDate = moment.now();
  // const diff = moment(endDate).diff(moment(startDate), 'minutes', true);

  // console.log('Crawling finished!');
  // console.log(`Time lapse: ${Math.round(diff * 100) / 100} minutes`);
  
  browser.close();
})();