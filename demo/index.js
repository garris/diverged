'use strict';
const ts = new Date().getTime();
const OUTPUT_PATH = `../results/${ts}.png`

// const REF_PATH = './fixtures/pricing/1024_ref.png';
// const TEST_PATH = './fixtures/pricing/1024_test.png';
const REF_PATH = '../fixtures/pricing/320_ref.png';
const TEST_PATH = '../fixtures/pricing/320_test.png';



const PNG = require('pngjs').PNG;
const fs = require('fs');
const match = require('pixelmatch');
const diverged = require('../src/diverged');


var threshold = undefined,
    includeAA = false;

var ref_img = fs.createReadStream(REF_PATH).pipe(new PNG()).on('parsed', runDiverged);
var test_img = fs.createReadStream(TEST_PATH).pipe(new PNG()).on('parsed', runDiverged);

function runDiverged() {
    if (!ref_img.data || !test_img.data) return;

    var diff = new PNG({width: ref_img.width, height: ref_img.height});
    var divergedDiff = diverged(ref_img.data, test_img.data, ref_img.height, ref_img.width);

    diff.data = divergedDiff;

    diff.pack().pipe(fs.createWriteStream(OUTPUT_PATH));
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

    console.log('diverged pixels: ' + diffs);
    console.log('error: ' + (Math.round(100 * 100 * diffs / (diff.width * diff.height)) / 100) + '%');
}
