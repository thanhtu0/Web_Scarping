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

		await page.waitForSelector('div.dateBar-Jrg4WDKWIO');
		await page.waitForSelector('div.row-u9F3b9WCM3');

		const matchesByDate = await page.evaluate(async () => {
			const dateSections = Array.from(document.querySelectorAll('div.dateBar-Jrg4WDKWIO'));
			const allRows = Array.from(document.querySelectorAll('div.row-u9F3b9WCM3'));

			let results = [];
			let currentDateText = '';
			let rowIndex = 0;

			const getPriceValue = (element) => {
				const priceElement = element.querySelector('span.price-r5BU0ynJha');
				return priceElement ? priceElement.innerText || 'Unavailable' : 'Unavailable';
			};

			const getTeamsAndTime = (gameElement) => {
				const teams = Array.from(gameElement.querySelectorAll('span.gameInfoLabel-EDDYv5xEfd'));
				const startTimeElement = gameElement.querySelector('div.matchupDate-tnomIYorwa');
				return {
					Home: teams[0] ? teams[0].innerText : 'Unavailable',
					Away: teams[1] ? teams[1].innerText : 'Unavailable',
					startTime: startTimeElement ? startTimeElement.innerText : '',
				};
			};

			const getMoneyLine = (row) => {
				const moneyLineElement = row.querySelector('div.moneyline-i2WQM8REwI');
				if (!moneyLineElement) return { Home: 'Unavailable', Away: 'Unavailable' };

				const moneyLines = Array.from(moneyLineElement.querySelectorAll('button.market-btn'));
				return {
					Home: getPriceValue(moneyLines[0]),
					Away: getPriceValue(moneyLines[1]),
				};
			};

			const getHandicap = async (row) => {
				const home = {};
				const away = {};
				const handicapIconSelector =
					'div.buttons-j19Jlcwsi9:nth-child(3) div.alternates-PCB1HT1nLi a.expandBtn-bhQlYCR2vJ';
				const handicapIcon = row.querySelector(handicapIconSelector);

				if (handicapIcon) {
					handicapIcon.click();
					await new Promise((resolve) => setTimeout(resolve, 1000));
					const handicapElements = row.querySelectorAll(
						'div.buttons-j19Jlcwsi9:nth-child(3) div.buttons-kyb_t0XZAi'
					);
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
				return { Home: home, Away: away };
			};

			const getTotals = async (row) => {
				const over = {};
				const under = {};
				const totalIconSelector =
					'div.buttons-j19Jlcwsi9:nth-child(4) div.alternates-PCB1HT1nLi a.expandBtn-bhQlYCR2vJ';
				const totalIcon = row.querySelector(totalIconSelector);

				if (totalIcon) {
					totalIcon.click();
					await new Promise((resolve) => setTimeout(resolve, 1000));
					const totalElements = row.querySelectorAll(
						'div.buttons-j19Jlcwsi9:nth-child(4) div.buttons-kyb_t0XZAi'
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
								underButton.querySelector('span.label-GT4CkXEOFj')?.innerText ||
								'Unavailable';
							const underPrice =
								underButton.querySelector('span.price-r5BU0ynJha')?.innerText ||
								'Unavailable';

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
								under[formattedUnderLabel] = {
									label: formattedUnderLabel,
									price: underPrice,
								};
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
				return { Over: sortedOver, Under: sortedUnder };
			};

			for (const dateSection of dateSections) {
				const dateText = dateSection.innerText.trim().replace(/\n/g, ' ');
				const matchesForDate = { date: dateText, leagues: [] };
				let currentLeague = 'Unknown League';

				while (rowIndex < allRows.length) {
					const row = allRows[rowIndex];
					const rowDateElement = row.previousElementSibling?.matches('div.dateBar-Jrg4WDKWIO')
						? row.previousElementSibling
						: null;
					if (rowDateElement) {
						currentDateText = rowDateElement.innerText.trim().replace(/\n/g, ' ');
					}

					if (currentDateText !== dateText) break;

					const leagueElement = row.querySelector('a.rowLink-rtJhYcYkm5 span.ellipsis');
					if (leagueElement && leagueElement.innerText.trim() !== '') {
						currentLeague = leagueElement.innerText.trim();
					}

					const gameElement = row.querySelector('div.matchupMetadata-ghPeUsb2MR');
					if (!gameElement) {
						rowIndex++;
						continue;
					}

					const { Home, Away, startTime } = getTeamsAndTime(gameElement);
					const moneyLine = getMoneyLine(row);
					const [handicap, total] = await Promise.all([getHandicap(row), getTotals(row)]);

					const game = { Home, Away, startTime, moneyLine, handicap, total };

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
