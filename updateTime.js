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
