'use strict';
const OUTPUT_PATH = `./${new Date().getTime()}.png`; //todo: use path.resolve()

const PNG = require('pngjs').PNG;
const fs = require('fs');
const diverged = require('./diverged');

function divergedNode(referencePath, testPath, outputPath, options) {
    var referenceImage = fs.createReadStream(referencePath).pipe(new PNG()).on('parsed', runDiverged);
    var testImage = fs.createReadStream(testPath).pipe(new PNG()).on('parsed', runDiverged);

    if (referenceImage.width !== testImage.width || referenceImage.height !== testImage.height) {
        console.log('Error: Image dimentions must be the same.');
        return new Error('Image dimentions must be the same.');
    }

    function runDiverged() {
        if (!referenceImage.data || !testImage.data) return;

        var divergedDiff = diverged(referenceImage.data, testImage.data, referenceImage.height, referenceImage.width);

        var diff = new PNG({width: referenceImage.width, height: referenceImage.height});
        diff.data = divergedDiff;

        diff.pack().pipe(fs.createWriteStream(outputPath || OUTPUT_PATH));

        return 0;
    }
}

module.exports = divergedNode;
