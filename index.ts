import nodemailer from 'nodemailer'
const accountSid = '##################################';
const authToken = '##################################';
const client = require('twilio')(accountSid, authToken);



const websites = [
    `https://www.elkjop.no/search/7900%2520xtx/`,
    `https://www.komplett.no/search?q=7900+xtx/`,
    `https://www.proshop.no/?s=7900+xtx/`,
    `https://www.multicom.no/search?kw=7900+xtx/`,
    `https://deal.no/search?kw=7900%20xtx/`,
    `https://www.netonnet.no/search?query=7900+xtx/`,
    `https://cdon.no/catalog/search?q=7900%20xtx/`,
    `https://www.power.no/search/?q=7900%20xtx`
]

var websiteFetchOptions = [
    {
        domain: 'elkjop.no',
        itemSelector: 'elk-product-tile',
        avalibleSelector: '.product-delivery',
        avalibleText: 'På nettlager',
        priceSelector: '.price__value',
        enterItem: false,
        buySelector: '',
        titleSelector: '.product-tile__content'
    },
    {
        domain: 'komplett.no',
        itemSelector: '.product-list-item',
        avalibleSelector: '.stockstatus-stock-details',
        avalibleText: ' stk. på lager',
        priceSelector: '.product-price-now',
        enterItem: false,
        buySelector: '',
        titleSelector: '.product-link h2'
    },
    {
        domain: 'proshop.no',
        itemSelector: '.site-panel .toggle',
        avalibleSelector: '.site-stock-text',
        avalibleText: ['på lager -', 'Fjernlager,'],
        priceSelector: '.site-currency-lg',
        enterItem: false,
        buySelector: '',
        titleSelector: '.site-product-link h2'
    },
    {
        domain: 'multicom.no',
        itemSelector: '.b-product-list__item',
        avalibleSelector: '.b-stock-info__amount',
        avalibleText: 'stk',
        priceSelector: '.b-product-price__container',
        enterItem: false,
        buySelector: '',
        titleSelector: '.b-product-list__item-name a'
    },
    {
        domain: 'deal.no',
        itemSelector: '.b-product-list__item',
        avalibleSelector: '.b-show-stock__container',
        avalibleText: 'Antall:',
        priceSelector: '.b-price .b-price_partslist',
        enterItem: false,
        buySelector: '',
        titleSelector: '.b-product-list__item-name a'
    },
    {
        domain: 'netonnet.no',
        itemSelector: '.cProductItem',
        avalibleSelector: '.svg .small .success .check',
        avalibleText: '',
        priceSelector: '.price',
        enterItem: false,
        buySelector: '',
        titleSelector: '.smallHeader .shortText a'
    },
    {
        domain: 'cdon.no',
        itemSelector: '.product-list-wrapper a .p-c',
        priceSelector: '.p-c__current-price',
        titleSelector: '.p-c__title',
    },
    {
        domain: 'power.no',
        itemSelector: '.product-item',
        avalibleSelector: '.stock .stock-available',
        priceSelector: 'pwr-price',
        titleSelector: '.product-item-title-container h6'
    }

]


const SendEmail = (subject, body) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: '############@gmail.com',
            pass: '##################',
        },
    });
    transporter.verify().then(console.log).catch(console.error);
    transporter.sendMail({
        from: 'Product notification <#########@gmail.com>',
        to: "########+notify@gmail.com",
        subject: subject,
        text: body,
    }).then(info => {
        console.log({ info });
    }).catch(console.error);
}





const { join } = require('path');


/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer.
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};


import puppeteer from 'puppeteer';
import fs from 'node:fs'
import _ from 'lodash';


const checkFunc = () => {
    console.log(`Triggering refresh at ${new Date().toLocaleTimeString()}`);


    let ls = [];

    (async () => {
        const browser = await puppeteer.launch({
            headless: true,
            args: [`--window-size=${1920},${1080}`], // new option
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });
        const page = await browser.newPage();

        for (const site of websites) {
            await page.goto(site);
            await page.waitForSelector('body');

            const domain = websiteFetchOptions.find(x => site.includes(x.domain));


            const itemSelector = domain.itemSelector;
            try {
                await page.waitForSelector(itemSelector, { timeout: 2500, });

                const links = await page.evaluate(({ itemSelector, domain }) => {
                    return [...document.querySelectorAll(itemSelector)].map(item => {
                        let hasItem = !domain.avalibleText;
                        let title = item.querySelector(domain.titleSelector)?.textContent ?? '-1';
                        let price = item.querySelector(domain.priceSelector)?.textContent ?? '-1';

                        const query = item.querySelectorAll(domain.avalibleSelector)
                        if (!domain.avalibleSelector) {
                            hasItem = true;
                        }
                        else {
                            if (!domain.avalibleText) {
                                query.length !== 0 ? hasItem = true : hasItem = false;
                            } else {
                                query.forEach(span => {
                                    if (!Array.isArray(domain.avalibleText)) {
                                        if (span.textContent.toLowerCase().includes(domain.avalibleText.toLowerCase())) {
                                            hasItem = true;
                                        }
                                    } else {
                                        domain.avalibleText.forEach(text => {
                                            if (span.textContent.toLowerCase().includes(text.toLowerCase())) {
                                                hasItem = true;
                                            }
                                        });
                                    }
                                });
                            }
                        }

                        function removeNonNumeric(str: string): number {
                            const parsedStr = str?.split(",")[0]?.replace(/[^0-9]/g, "");
                            return parseInt(parsedStr ?? '-1');
                        }

                        function filterString(str: string): string {
                            try {
                                return str?.replace(/[\t\n]/g, "");
                            } catch (error) {
                                return str;
                            }
                        }


                        return { hasItem, title: filterString(title), priceInt: removeNonNumeric(price), domain: domain.domain, link: (item as any)?.href ?? item.querySelector('a')?.href ?? '' };
                    });
                }, { itemSelector, domain });
                ls = [...ls, ...links];

            } catch (error) {

            }


        }

        console.log(`Found ${ls.length} items`);


        var file = fs.readFileSync('data.json');
        var json = JSON.parse(file.toString());

        let changedItems = [];

        ls.filter(x => x.priceInt > 7000 && x.priceInt < 16000).forEach(item => {
            let equalFound = false;
            json.forEach((jsonItem: any) => {
                if (_.isEqual(item, jsonItem)) {
                    equalFound = true;
                }
            });
            if (!equalFound) {
                changedItems.push(item);
                console.log('new item found');
                console.log(item);
            }
        })

        if (changedItems.length > 0) {
            try {
                let msg = ''
                if (changedItems.length == 1) {
                    msg = `New item found: ${changedItems[0].title} - ${changedItems[0].priceInt} - ${changedItems[0].domain} - ${changedItems[0].link}`
                } else {
                    msg = `New items found: ${changedItems.length}`
                }
                SendEmail(
                    'New items found',
                    changedItems.map(x =>
                        `New item found: ${x.title} - ${x.priceInt} - ${x.domain} - ${x.link}`
                    ).join('\n')
                     + `\n\n` + 
                     `
                     Items in stock: ${JSON.stringify(ls.filter(x => x.hasItem && x.priceInt > 7000 && x.priceInt < 16000), null, 2)}
                     `
                )


                client.messages
                    .create({
                        body: msg,
                        messagingServiceSid: '##################################',
                        to: '+47###########',
                    })
                    .then(message => console.log(message.sid))
                    .done();
            } catch (error) {

            }
        }

        fs.writeFileSync('data.json', JSON.stringify(ls, null, 2));
        await browser.close();
    })();
}
//SendEmail(`Product checker started`, 'Product checker started')
setTimeout(function () {
    checkFunc()
    setInterval(function () {
        checkFunc()
    }, 300000);
}, 2000);