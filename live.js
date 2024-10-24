const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const url = 'https://www.pinnacle.com/en/baseball/matchups/live/';

async function scrapeData() {
	try {
		const browser = await puppeteer.launch({
			headless: false,
			args: ['--start-maximized', '--disable-cache'],
		});
		const page = await browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);
		await page.goto(url, {
			waitUntil: 'domcontentloaded',
			timeout: 60000,
		});

		try {
			await page.waitForSelector('div.row-u9F3b9WCM3');

			const matchesByLeague = await page.evaluate(async () => {
				const rows = Array.from(document.querySelectorAll('div.row-u9F3b9WCM3'));
				const leagues = {};
				let currentLeague = 'Unknown League';

				for (const row of rows) {
					const leagueElement = row.querySelector('a.rowLink-rtJhYcYkm5 span.ellipsis');
					if (leagueElement && leagueElement.innerText.trim() !== '') {
						currentLeague = leagueElement.innerText.trim();
					}

					const gameElement = row.querySelector('div.matchupMetadata-ghPeUsb2MR');
					if (!gameElement) continue;

					const teams = Array.from(gameElement.querySelectorAll('span.gameInfoLabel-EDDYv5xEfd'));

					const timeLiveElement = gameElement.querySelector('div.matchupDate-tnomIYorwa');
					const timeLive = timeLiveElement ? timeLiveElement.innerText : '';

					const moneyLineElement = row.querySelector('div.moneyline-i2WQM8REwI');
					if (!moneyLineElement) continue;

					const moneyLines = Array.from(moneyLineElement.querySelectorAll('button.market-btn'));
					const getPriceValue = (element) => {
						const priceElement = element.querySelector('span.price-r5BU0ynJha');
						if (priceElement) {
							return priceElement.innerText || 'Unavailable';
						} else if (element.querySelector('svg.offline-nbnL6WIHML')) {
							return 'Currently Offline';
						}
						return 'Unavailable';
					};

					const Home = getPriceValue(moneyLines[0]) || 'Unavailable';
					const Away = getPriceValue(moneyLines[1]) || 'Unavailable';

					const home = {};
					const away = {};
					const handicapIconSelector =
						'div.buttons-j19Jlcwsi9:nth-child(3) div.alternates-PCB1HT1nLi a.expandBtn-bhQlYCR2vJ';
					const handicapIcon = row.querySelector(handicapIconSelector);

					try {
						if (handicapIcon) {
							handicapIcon.click();
							await new Promise((resolve) => setTimeout(resolve, 1000));
							const handicapElements = row.querySelectorAll('div.buttons-kyb_t0XZAi');

							handicapElements.forEach((handicapGroup) => {
								const buttons = Array.from(handicapGroup.querySelectorAll('button.market-btn'));

								if (buttons.length >= 2) {
									const homeButton = buttons[0];
									const awayButton = buttons[1];

									const homeLabel =
										homeButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
									const homePrice =
										homeButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

									const awayLabel =
										awayButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
									const awayPrice =
										awayButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

									if (
										homeButton.querySelector('svg.offline-nbnL6WIHML') &&
										awayButton.querySelector('svg.offline-nbnL6WIHML')
									) {
										home['Currently Offline'] = {
											label: 'Currently Offline',
											price: 'Currently Offline',
										};
										away['Currently Offline'] = {
											label: 'Currently Offline',
											price: 'Currently Offline',
										};
									} else {
										home[homeLabel] = { label: homeLabel, price: homePrice };
										away[awayLabel] = { label: awayLabel, price: awayPrice };
									}
								}
							});
						} else {
							const buttons = row.querySelectorAll(
								'div.buttons-j19Jlcwsi9:nth-child(3) button.market-btn'
							);
							if (buttons.length >= 2) {
								const homeButton = buttons[0];
								const awayButton = buttons[1];

								const homeLabel =
									homeButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
								const homePrice =
									homeButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

								const awayLabel =
									awayButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
								const awayPrice =
									awayButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

								if (
									homeButton.querySelector('svg.offline-nbnL6WIHML') &&
									awayButton.querySelector('svg.offline-nbnL6WIHML')
								) {
									home['Currently Offline'] = {
										label: 'Currently Offline',
										price: 'Currently Offline',
									};
									away['Currently Offline'] = {
										label: 'Currently Offline',
										price: 'Currently Offline',
									};
								} else {
									home[homeLabel] = { label: homeLabel, price: homePrice };
									away[awayLabel] = { label: awayLabel, price: awayPrice };
								}
							}
						}
					} catch (error) {
						console.error('Error interacting with handicapIcon: ', error.message);
					}

					const totalIconSelector =
						'div.buttons-j19Jlcwsi9:nth-child(4) div.alternates-PCB1HT1nLi a.expandBtn-bhQlYCR2vJ';
					const totalIcon = row.querySelector(totalIconSelector);

					const over = {};
					const under = {};
					try {
						if (totalIcon) {
							totalIcon.click();
							await new Promise((resolve) => setTimeout(resolve, 1000));
							const totalElements = row.querySelectorAll(
								'div.buttons-j19Jlcwsi9:nth-child(4) div.alternates-PCB1HT1nLi div.container-f8262afac05676590fa1 div.buttons-kyb_t0XZAi'
							);
							totalElements.forEach((totalGroup) => {
								const buttons = Array.from(totalGroup.querySelectorAll('button.market-btn'));
								if (buttons.length >= 2) {
									const overButton = buttons[0];
									const underButton = buttons[1];

									const overLabel =
										overButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
									const overPrice =
										overButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

									const underLabel =
										underButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
									const underPrice =
										underButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

									if (
										overButton.querySelector('svg.offline-nbnL6WIHML') &&
										underButton.querySelector('svg.offline-nbnL6WIHML')
									) {
										over['Currently Offline'] = {
											label: 'Currently Offline',
											price: 'Currently Offline',
										};
										under['Currently Offline'] = {
											label: 'Currently Offline',
											price: 'Currently Offline',
										};
									} else {
										const formattedOverLabel = !isNaN(parseFloat(overLabel))
											? parseFloat(overLabel).toFixed(1)
											: overLabel;
										const formattedUnderLabel = !isNaN(parseFloat(underLabel))
											? parseFloat(underLabel).toFixed(1)
											: underLabel;
										over[formattedOverLabel] = { label: formattedOverLabel, price: overPrice };
										under[formattedUnderLabel] = { label: formattedUnderLabel, price: underPrice };
									}
								}
							});
						} else {
							const buttons = row.querySelectorAll(
								'div.buttons-j19Jlcwsi9:nth-child(4) button.market-btn'
							);
							if (buttons.length >= 2) {
								const overButton = buttons[0];
								const underButton = buttons[1];

								const overLabel =
									overButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
								const overPrice =
									overButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

								const underLabel =
									underButton.querySelector('span.label-GT4CkXEOFj')?.innerText || 'Unavailable';
								const underPrice =
									underButton.querySelector('span.price-r5BU0ynJha')?.innerText || 'Unavailable';

								if (
									overButton.querySelector('svg.offline-nbnL6WIHML') &&
									underButton.querySelector('svg.offline-nbnL6WIHML')
								) {
									over['Currently Offline'] = {
										label: 'Currently Offline',
										price: 'Currently Offline',
									};
									under['Currently Offline'] = {
										label: 'Currently Offline',
										price: 'Currently Offline',
									};
								} else {
									const formattedOverLabel = !isNaN(parseFloat(overLabel))
										? parseFloat(overLabel).toFixed(1)
										: overLabel;
									const formattedUnderLabel = !isNaN(parseFloat(underLabel))
										? parseFloat(underLabel).toFixed(1)
										: underLabel;
									over[formattedOverLabel] = { label: formattedOverLabel, price: overPrice };
									under[formattedUnderLabel] = { label: formattedUnderLabel, price: underPrice };
								}
							}
						}
					} catch (error) {
						console.error('Error interacting with totalIcon: ', error.message);
					}

					const sortedOver = Object.keys(over)
						.sort((a, b) => parseFloat(b) - parseFloat(a))
						.reduce((acc, key) => {
							acc[key] = over[key];
							return acc;
						}, {});

					const sortedUnder = Object.keys(under)
						.sort((a, b) => parseFloat(b) - parseFloat(a))
						.reduce((acc, key) => {
							acc[key] = under[key];
							return acc;
						}, {});

					const game = {
						Home: teams[0] ? teams[0].innerText : '',
						Away: teams[1] ? teams[1].innerText : '',
						timeLive: timeLive,
						moneyLine: { Home: Home, Away: Away },
						handicap: { Home: home, Away: away },
						total: { Over: sortedOver, Under: sortedUnder },
					};

					if (!leagues[currentLeague]) {
						leagues[currentLeague] = { league: currentLeague, games: [] };
					}

					leagues[currentLeague].games.push(game);
				}

				return Object.values(leagues);
			});

			if (fs.existsSync('live.json')) {
				const previousData = JSON.parse(fs.readFileSync('live.json', 'utf8'));

				fs.writeFileSync('oldLive.json', JSON.stringify(previousData, null, 2), (err) => {
					if (err) throw err;
				});
			}

			fs.writeFileSync('live.json', JSON.stringify(matchesByLeague, null, 2), (err) => {
				if (err) throw err;
			});

			await browser.close();

			setTimeout(scrapeData, 1000);
		} catch (error) {
			await page.waitForSelector('div.noEventsContainer-z7z9wBr6LD ');

			const noEvents = await page.$('div.noEventsContainer-z7z9wBr6LD ');
			if (noEvents) {
				if (fs.existsSync('live.json')) {
					const previousData = JSON.parse(fs.readFileSync('live.json', 'utf8'));

					fs.writeFileSync('oldLive.json', JSON.stringify(previousData, null, 2), (err) => {
						if (err) throw err;
					});
				}

				fs.writeFileSync('live.json', JSON.stringify([], null, 2), (err) => {
					if (err) throw err;
					console.log('No events, returning empty array.');
				});

				await browser.close();

				setTimeout(scrapeData, 1000);
				return;
			}
		}
	} catch (error) {
		console.error('Error scraping data: ', error.message);
		setTimeout(scrapeData, 1000);
	}
}

scrapeData();
