'use strict';
const ts = new Date().getTime();

const REF_PATH = './fixtures/ref.png';
const TEST_PATH = './fixtures/test.png';
const OUTPUT_PATH = `./diff/${ts}.png`


var PNG = require('pngjs').PNG,
    fs = require('fs'),
    match = require('./node_modules/pixelmatch/');


var threshold = undefined,
    includeAA = false;

var ref_img = fs.createReadStream(REF_PATH).pipe(new PNG()).on('parsed', runDiff);
var test_img = fs.createReadStream(TEST_PATH).pipe(new PNG()).on('parsed', runDiff);











function logData() {
    if (!ref_img.data || !test_img.data) return;
    console.log('ref_img>>',ref_img.data.toString('hex'));
    // console.log('test_img>>',test_img.data.toString('hex'));
}











function runDiff() {
    if (!ref_img.data || !test_img.data) return;

    var diff = new PNG({width: ref_img.width, height: ref_img.height});

    console.time('match');
    var diffs = match(ref_img.data, test_img.data, diff.data, diff.width, diff.height, {
        threshold: threshold,
        includeAA: includeAA
    });
    console.timeEnd('match');

    diff.pack().pipe(fs.createWriteStream(OUTPUT_PATH));

    console.log('different pixels: ' + diffs);
    console.log('error: ' + (Math.round(100 * 100 * diffs / (diff.width * diff.height)) / 100) + '%');
}
