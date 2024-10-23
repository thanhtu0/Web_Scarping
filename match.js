const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const url = 'https://www.pinnacle.com/en/baseball/matchups/';

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

		await page.waitForSelector('div.dateBar-b83858329620e87b99fb');
		await page.waitForSelector('div.row-bbd1776fd58233709296');

		const matchesByDate = await page.evaluate(async () => {
			const dateSections = Array.from(document.querySelectorAll('div.dateBar-b83858329620e87b99fb'));
			const allRows = Array.from(document.querySelectorAll('div.row-bbd1776fd58233709296'));

			let results = [];
			let currentDateText = '';
			let rowIndex = 0;

			for (const dateSection of dateSections) {
				const dateText = dateSection.innerText.trim().replace(/\n/g, ' ');

				const matchesForDate = {
					date: dateText,
					leagues: [],
				};

				let currentLeague = 'Unknown League';

				while (rowIndex < allRows.length) {
					const row = allRows[rowIndex];

					const rowDateElement = row.previousElementSibling?.matches('div.dateBar-b83858329620e87b99fb')
						? row.previousElementSibling
						: null;
					if (rowDateElement) {
						currentDateText = rowDateElement.innerText.trim().replace(/\n/g, ' ');
					}

					if (currentDateText !== dateText) {
						break;
					}

					const leagueElement = row.querySelector('a.rowLink-aed26161c6249b973e05 span.ellipsis');
					if (leagueElement && leagueElement.innerText.trim() !== '') {
						currentLeague = leagueElement.innerText.trim();
					}

					const gameElement = row.querySelector('div.matchupMetadata-ea084f794b1bd8c45ab5');
					if (!gameElement) {
						rowIndex++;
						continue;
					}

					const startTimeElement = gameElement.querySelector('div.matchupDate-b67a26218a2bc1a1f242 span');
					// const teams = Array.from(gameElement.querySelectorAll('span.event-row-participant'));
					const teams = Array.from(gameElement.querySelectorAll('span.gameInfoLabel-d8bf9c447dde89f4b6d3'));
					const startTime = startTimeElement ? startTimeElement.innerText : '';

					const moneyLineElement = row.querySelector('div.moneyline-b659033c444c08949788');
					if (!moneyLineElement) {
						rowIndex++;
						continue;
					}

					const moneyLines = Array.from(moneyLineElement.querySelectorAll('button.market-btn'));
					const getPriceValue = (element) => {
						const priceElement = element.querySelector('span.price-af9054d329c985ad490f');
						if (priceElement) {
							return priceElement.innerText || 'Unavailable';
						} else if (element.querySelector('svg.offline-db9cbe9620730b144e66')) {
							return 'Currently Offline';
						}
						return 'Unavailable';
					};

					const Home = getPriceValue(moneyLines[0]) || 'Unavailable';
					const Away = getPriceValue(moneyLines[1]) || 'Unavailable';

					const home = {};
					const away = {};
					const handicapIconSelector =
						'div.buttons-f5f4995cc2c8bd104b1a:nth-child(3) div.alternates-c20751d3d672e2ddab42 a.expandBtn-e1425602476bc9f253e1';
					const handicapIcon = row.querySelector(handicapIconSelector);

					try {
						if (handicapIcon) {
							handicapIcon.click();
							await new Promise((resolve) => setTimeout(resolve, 1000));
							const handicapElements = row.querySelectorAll('div.buttons-ffb745d9022e203b172d');
							handicapElements.forEach((handicapGroup) => {
								const buttons = Array.from(handicapGroup.querySelectorAll('button.market-btn'));

								if (buttons.length >= 2) {
									const homeButton = buttons[0];
									const awayButton = buttons[1];

									const homeLabel =
										homeButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
										'Unavailable';
									const homePrice =
										homeButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
										'Unavailable';

									const awayLabel =
										awayButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
										'Unavailable';
									const awayPrice =
										awayButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
										'Unavailable';

									if (
										homeButton.querySelector('svg.offline-db9cbe9620730b144e66') &&
										awayButton.querySelector('svg.offline-db9cbe9620730b144e66')
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
								'div.buttons-f5f4995cc2c8bd104b1a:nth-child(3) button.market-btn'
							);
							if (buttons.length >= 2) {
								const homeButton = buttons[0];
								const awayButton = buttons[1];

								const homeLabel =
									homeButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
									'Unavailable';
								const homePrice =
									homeButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
									'Unavailable';

								const awayLabel =
									awayButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
									'Unavailable';
								const awayPrice =
									awayButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
									'Unavailable';

								if (
									homeButton.querySelector('svg.offline-db9cbe9620730b144e66') &&
									awayButton.querySelector('svg.offline-db9cbe9620730b144e66')
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

					const over = {};
					const under = {};
					const totalIconSelector =
						'div.buttons-f5f4995cc2c8bd104b1a:nth-child(4) div.alternates-c20751d3d672e2ddab42 a.expandBtn-e1425602476bc9f253e1';
					const totalIcon = row.querySelector(totalIconSelector);

					try {
						if (totalIcon) {
							try {
								totalIcon.click();
								await new Promise((resolve) => setTimeout(resolve, 1000));
								const totalElements = row.querySelectorAll(
									'div.buttons-f5f4995cc2c8bd104b1a:nth-child(4) div.alternates-c20751d3d672e2ddab42 div.container-f8262afac05676590fa1 div.buttons-ffb745d9022e203b172d'
								);
								totalElements.forEach((totalGroup) => {
									const buttons = Array.from(totalGroup.querySelectorAll('button.market-btn'));
									if (buttons.length >= 2) {
										const overButton = buttons[0];
										const underButton = buttons[1];

										const overLabel =
											overButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
											'Unavailable';
										const overPrice =
											overButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
											'Unavailable';

										const underLabel =
											underButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
											'Unavailable';
										const underPrice =
											underButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
											'Unavailable';

										if (
											overButton.querySelector('svg.offline-db9cbe9620730b144e66') &&
											underButton.querySelector('svg.offline-db9cbe9620730b144e66')
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
											under[formattedUnderLabel] = {
												label: formattedUnderLabel,
												price: underPrice,
											};
										}
									}
								});
							} catch (error) {
								console.error('Error clicking totalIcon: ', error);
							}
						} else {
							const buttons = row.querySelectorAll(
								'div.buttons-f5f4995cc2c8bd104b1a:nth-child(4) button.market-btn'
							);
							if (buttons.length >= 2) {
								const overButton = buttons[0];
								const underButton = buttons[1];

								const overLabel =
									overButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
									'Unavailable';
								const overPrice =
									overButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
									'Unavailable';

								const underLabel =
									underButton.querySelector('span.label-e0291710e17e8c18f43f')?.innerText ||
									'Unavailable';
								const underPrice =
									underButton.querySelector('span.price-af9054d329c985ad490f')?.innerText ||
									'Unavailable';

								if (
									overButton.querySelector('svg.offline-db9cbe9620730b144e66') &&
									underButton.querySelector('svg.offline-db9cbe9620730b144e66')
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
						Home: teams[0] ? teams[0].innerText : 'Unavailable',
						Away: teams[1] ? teams[1].innerText : 'Unavailable',
						startTime: startTime,
						moneyLine: { Home: Home, Away: Away },
						handicap: { Home: home, Away: away },
						total: { Over: sortedOver, Under: sortedUnder },
					};

					let league = matchesForDate.leagues.find((l) => l.league === currentLeague);
					if (!league) {
						league = { league: currentLeague, games: [] };
						matchesForDate.leagues.push(league);
					}
					league.games.push(game);

					rowIndex++;
				}

				results.push(matchesForDate);
			}

			return results;
		});

		if (fs.existsSync('match.json')) {
			const previousData = JSON.parse(fs.readFileSync('match.json', 'utf8'));

			fs.writeFileSync('oldMatch.json', JSON.stringify(previousData, null, 2), (err) => {
				if (err) throw err;
			});
		}

		fs.writeFileSync('match.json', JSON.stringify(matchesByDate, null, 2), (err) => {
			if (err) throw err;
		});

		await browser.close();
		setTimeout(scrapeData, 1000);
	} catch (error) {
		console.error('Error scraping data: ', error.message);
		setTimeout(scrapeData, 1000);
	}
}

scrapeData();
