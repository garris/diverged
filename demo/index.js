'use strict';

const REF_PATH = '../fixtures/pricing/320_ref.png';
const TEST_PATH = '../fixtures/pricing/320_test.png';
const OUTPUT_PATH = `../results/${new Date().getTime()}.png`

const diverged = require('../src/diverged-node')
const result = diverged(REF_PATH, TEST_PATH, OUTPUT_PATH);
