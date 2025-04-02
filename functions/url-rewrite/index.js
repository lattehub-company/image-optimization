// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

function handler(event) {
	var request = event.request;
	const SUPPORTED_FORMATS = ['auto', 'jpeg', 'webp', 'png', 'svg', 'gif'];
	const originalImagePath = request.uri;

	if (
		originalImagePath.endsWith('.gif') ||
		originalImagePath.endsWith('.avif')
	) {
		let currentHost = request.headers['host']
			? request.headers['host'].value
			: 'cdn.cacheimg.com';
		var newDomain = currentHost.replace('cdn', 'minio'); // Replace 'cdn' with 'minio'
		var redirectUrl = `https://${newDomain}/img/720/0/resize/${originalImagePath}`;

		return {
			statusCode: 302,
			headers: {
				location: { value: redirectUrl },
			},
		};
	}

	let normalizedOperations = { width: '400', format: 'jpeg', quality: '100' };
	if (request.querystring) {
		Object.keys(request.querystring).forEach((operation) => {
			let rawValue = request.querystring[operation]['value'];
			switch (operation.toLowerCase()) {
				case 'f':
					if (
						rawValue &&
						SUPPORTED_FORMATS.includes(rawValue.toLowerCase())
					) {
						let format = rawValue.toLowerCase(); // normalize to lowercase
						if (format === 'auto') format = 'jpeg';
						normalizedOperations['format'] = format;
					}
					break;
				case 'w':
					if (rawValue) {
						let width = parseInt(rawValue) || 0;
						if (!isNaN(width) && width > 0) {
							width = findClosestWidth(width);
							// you can protect the Lambda function by setting a max value, e.g. if (width > 4000) width = 4000;
							normalizedOperations['width'] = width.toString();
						}
					}
					break;
				case 'q':
					if (rawValue) {
						let quality = parseInt(rawValue);
						if (!isNaN(quality) && quality > 0) {
							quality = findClosestQuality(quality);
							normalizedOperations['quality'] =
								quality.toString();
						}
					}
					break;
				default:
					break;
			}
		});
	}

	if (request.headers['accept']) {
		if (request.headers['accept'].value.includes('webp')) {
			normalizedOperations['format'] = 'webp';
		}
	}

	if (originalImagePath.endsWith('.gif')) {
		normalizedOperations.format = 'gif';
		delete normalizedOperations.quality;
		delete normalizedOperations.width;
		delete normalizedOperations.height;
	}

	// put them in order
	let normalizedOperationsArray = [];
	if (normalizedOperations.format)
		normalizedOperationsArray.push('format=' + normalizedOperations.format);
	if (normalizedOperations.quality)
		normalizedOperationsArray.push(
			'quality=' + normalizedOperations.quality
		);
	if (normalizedOperations.width)
		normalizedOperationsArray.push('width=' + normalizedOperations.width);
	request.uri = originalImagePath + '/' + normalizedOperationsArray.join(',');

	// remove query strings
	request['querystring'] = {};
	return request;
}

function findClosestWidth(requestedWidth) {
	return [
		64, 100, 128, 200, 300, 400, 500, 600, 640, 700, 800, 900, 1024, 1280,
		1600, 1920,
	].reduce((prev, curr) => {
		return Math.abs(curr - requestedWidth) < Math.abs(prev - requestedWidth)
			? curr
			: prev;
	});
}

function findClosestQuality(requestedQuality) {
	return [30, 50, 80, 100].reduce((prev, curr) => {
		return Math.abs(curr - requestedQuality) <
			Math.abs(prev - requestedQuality)
			? curr
			: prev;
	});
}
