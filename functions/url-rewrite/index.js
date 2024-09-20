// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

function handler(event) {
    var request = event.request;
    var originalImagePath = request.uri;
    //  validate, process and normalize the requested operations in query parameters
    var normalizedOperations = {};
    if (request.querystring) {
        Object.keys(request.querystring).forEach(operation => {
            switch (operation.toLowerCase()) {
                case 'f': 
                    var SUPPORTED_FORMATS = ['auto', 'jpeg', 'webp', 'avif', 'png', 'svg', 'gif'];
                    if (request.querystring[operation]['value'] && SUPPORTED_FORMATS.includes(request.querystring[operation]['value'].toLowerCase())) {
                        var format = request.querystring[operation]['value'].toLowerCase(); // normalize to lowercase
                        if (format === 'auto') {
                            format = 'jpeg';
                            if (request.headers['accept']) {
                                if (request.headers['accept'].value.includes("avif")) {
                                    format = 'avif';
                                } else if (request.headers['accept'].value.includes("webp")) {
                                    format = 'webp';
                                } 
                            }
                        }
                        normalizedOperations['format'] = format;
                    }
                    break;
                case 'w':
                    if (request.querystring[operation]['value']) {
                        var width = parseInt(request.querystring[operation]['value']) || 0;
                        if (!isNaN(width) && (width > 0)) {
                            width = findClosestWidth(width);
                            // you can protect the Lambda function by setting a max value, e.g. if (width > 4000) width = 4000;
                            normalizedOperations['width'] = width.toString();
                        }
                    }
                    break;
                case 'h':
                    if (request.querystring[operation]['value']) {
                        var height = parseInt(request.querystring[operation]['value']) || 0;
                        if (!isNaN(height) && (height > 0)) {
                            // you can protect the Lambda function by setting a max value, e.g. if (height > 4000) height = 4000;
                            normalizedOperations['height'] = height.toString();
                        }
                    }
                    break;
                case 'q':
                    if (request.querystring[operation]['value']) {
                        var quality = parseInt(request.querystring[operation]['value']);
                        if (!isNaN(quality) && (quality > 0)) {
                            if (quality > 100) quality = 100;
                            normalizedOperations['quality'] = quality.toString();
                        }
                    }
                    break;
                default: break;
            }
        });
        if(!normalizedOperations['width']) normalizedOperations['width'] = '400'; // default width
        if(!normalizedOperations['format']) normalizedOperations['format'] = 'jpeg'; // default format
        //rewrite the path to normalized version if valid operations are found
        if (Object.keys(normalizedOperations).length > 0) {
            // put them in order
            var normalizedOperationsArray = [];
            if (normalizedOperations.format) normalizedOperationsArray.push('format='+normalizedOperations.format);
            if (normalizedOperations.quality) normalizedOperationsArray.push('quality='+normalizedOperations.quality);
            if (normalizedOperations.width) normalizedOperationsArray.push('width='+normalizedOperations.width);
            // if (normalizedOperations.height) normalizedOperationsArray.push('height='+normalizedOperations.height);
            request.uri = originalImagePath + '/' + normalizedOperationsArray.join(',');     
        } else {
            // If no valid operation is found, flag the request with /original path suffix
            request.uri = originalImagePath + '/format=jpeg,width=400';  
        }

    } else {
        // If no query strings are found, flag the request with /original path suffix
        request.uri = originalImagePath + '/format=jpeg,width=400';
    }
    // remove query strings
    request['querystring'] = {};
    return request;
}

function findClosestWidth(requestedWidth) {
    return [120, 400, 640, 800, 1024, 1280, 1600, 1920].reduce((prev, curr) => {
        return Math.abs(curr - requestedWidth) < Math.abs(prev - requestedWidth) ? curr : prev;
    });
}
