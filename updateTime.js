function updateTime() {
	const options = {
		timeZone: 'America/Chicago',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: true,
	};
	const texasTime = new Date().toLocaleTimeString('en-US', options);
	document.getElementById('clock').innerHTML = `Time in Houston, Texas, United<br>States now: ${texasTime}`;
}

setInterval(updateTime, 1000);

// // const hasMatches = await page.$('.row-bbd1776fd58233709296');
// // if (!hasMatches) {
// // 	fs.writeFile('live.json', JSON.stringify([], null, 2), (err) => {
// // 		if (err) throw err;
// // 		console.log('No matches, empty data saved to live.json');
// // 	});
// // 	await browser.close();
// // 	return;
// // }

// //javascriptCopy code: Using Playwright for ARIA and text selectors
// await page.locator('text="Login"').click();
// await page.locator('[aria-label="Submit"]').click();

// //javascriptCopy code: Using Playwright to intercept API responses
// await page.route('**/api/data', (route) => {
// 	route.continue((response) => {
// 		const data = response.json();
// 		console.log(data);
// 	});
// });
// // Process or save the data

// //javascriptCopy code: Simulate scrolling with Playwright
// await page.evaluate(async () => {
// 	await new Promise((resolve) => {
// 		let totalHeight = 0;
// 		const distance = 100;
// 		const timer = setInterval(() => {
// 			window.scrollBy(0, distance);
// 			totalHeight += distance;
// 			if (totalHeight >= document.body.scrollHeight) {
// 				clearInterval(timer);
// 				resolve();
// 			}
// 		}, 100);
// 	});
// });
// // Adjust delay as necessary
