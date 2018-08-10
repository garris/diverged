'use strict';

var img1 = new Image();
img1.onload = isReady;
img1.src = "http://127.0.0.1:3000/fixtures/lpc/chwu_ref.png"; // insert image url here

var img2 = new Image();
img2.onload = isReady;
img2.src = "http://127.0.0.1:3000/fixtures/lpc/chwu_test.png"; // insert image url here

var hasRun = false;

function isReady() {
    if (
        img1.complete && 
        img2.complete && 
        !hasRun
    ) {
        hasRun = true;
        main();
    }
}

function main() {
    console.time("total_time");

    const h = img2.height;
    const w = img2.width;

    const img1Ctx = imageToCanvasContext(img1);
    const img2Ctx = imageToCanvasContext(img2);

    const pixelmatchResultImgData = getEmptyImgData(h, w);
    pixelmatch(
        getImgDataDataFromContext(img1Ctx),
        getImgDataDataFromContext(img2Ctx),
        pixelmatchResultImgData.data,
        w,
        h, 
        { threshold: .3, includeAA: true }
    );

    console.time("pixelmatchResult");
    const pixelmatchResult = imageToCanvasContext(null, w, h);
    pixelmatchResult.putImageData(pixelmatchResultImgData, 0, 0);
    console.timeEnd("pixelmatchResult");

    console.time("imgDataToWords");
    const img1wordArr = imgDataToWords(getImgDataDataFromContext(img1Ctx));
    const img2wordArr = imgDataToWords(getImgDataDataFromContext(img2Ctx));
    console.timeEnd("imgDataToWords");
    // console.log('img1Ctx pixelmatchResult>>>', imgDataToWords(getImgDataDataFromContext(img1Ctx)))
    // console.log('img2Ctx pixelmatchResult>>>', img2wordArr)

    console.time("imgDataWordArrToColsAndRows");
    let cols_rows_1 = imgDataWordArrToColsAndRows(img1wordArr, h, w);
    let cols_rows_2 = imgDataWordArrToColsAndRows(img2wordArr, h, w);
    console.timeEnd("imgDataWordArrToColsAndRows");
    // console.log("imgDataWordArrToColsAndRows>>>", cols_rows_1.columns, cols_rows_2.columns);

    console.time("columnDiffRaw");
    const columnDiffRaw = diffArr(cols_rows_1.columns, cols_rows_2.columns, h, w);
    console.timeEnd("columnDiffRaw");
    // console.log("columnDiffRaw>>>", columnDiffRaw);

    console.time("reduceColumnDiffRaw");
    const reducedColumnDiff = reduceColumnDiffRaw(columnDiffRaw, h, w);
    console.timeEnd("reduceColumnDiffRaw");
    console.log("reducedColumnDiff>>>", reducedColumnDiff);




    console.time("columnToImgDataWords");
    const convertedColumnDiffImgData = columnToImgDataWords(reducedColumnDiff, h, w);
    console.timeEnd("columnToImgDataWords");
    console.log("convertedColumnDiffImgData>>>", convertedColumnDiffImgData);

    console.time("imgDataWordsToImgData");
    const imgDataArr = convertImgDataWordsToImgData(convertedColumnDiffImgData);
    console.timeEnd("imgDataWordsToImgData");
    console.log("imgDataArr>>>", imgDataArr);

    // let meyersImgData = getImgDataObjFromContext(meyersDiffResult);
    

    // meyersImgData.data = imgDataArr;
    console.time("imgDataToMeyersImgData");
    let clampedImgData = getEmptyImgData(h, w)
    for (var i = imgDataArr.length - 1; i >= 0; i--) {
        clampedImgData.data[i] = imgDataArr[i];
    }
    var meyersDiffResult = imageToCanvasContext(null, w, h);
    meyersDiffResult.putImageData(clampedImgData, 0, 0);
    console.timeEnd("imgDataToMeyersImgData");
    console.log('meyersDiffResult>>>', clampedImgData);

    console.timeEnd("total_time");

    document.getElementById('refImage').src = img1Ctx.canvas.toDataURL("image/png");
    document.getElementById('testImage').src = img2Ctx.canvas.toDataURL("image/png");
    document.getElementById('pixelmatch').src = pixelmatchResult.canvas.toDataURL("image/png");
    document.getElementById('meyersResult').src = meyersDiffResult.canvas.toDataURL("image/png");

}




/**
 * ========= HELPERS ========
 */


function columnToImgDataWords(columns, h, w) {
    const imgDataWordsLength = w * h;

    let convertedArr = new Array(imgDataWordsLength);
    for (var i = 0; i < imgDataWordsLength; i++) {
        const {column, depth} = serialToColumnMap(i, h, w);
        convertedArr[i] = columns[column][depth];
    }
    return convertedArr;
}

function convertImgDataWordsToImgData(wordsArr) {
    let convertedArr = new Array(wordsArr.length * 4);
    for (var i = 0; i < wordsArr.length; i++) {
        const convertedOffset = i * 4;
        const segments = wordsArr[i].split('_');
        convertedArr[convertedOffset] = segments[0];
        convertedArr[convertedOffset+1] = segments[1];
        convertedArr[convertedOffset+2] = segments[2];
        convertedArr[convertedOffset+3] = segments[3];
    }
    return convertedArr;
}

const IS_DIFFERENT_WORD = '255_0_0_255';
const IS_SAME_WORD = '255_255_255_255';

function reduceColumnDiffRaw(columnDiffs, h, w) {
    let reducedColumns = new Array(columnDiffs.length);
    for (let columnIndex = 0; columnIndex < columnDiffs.length; columnIndex++) {
    // debugger
        const columnDiff = columnDiffs[columnIndex];
        let resultColumn = new Array();
        for (let depthIndex = 0; depthIndex < h; depthIndex++) {
            
            // console.log('columnDiff>>',columnDiff[depthIndex]);

            const pixelClass = columnDiff[depthIndex].added || columnDiff[depthIndex].removed ? IS_DIFFERENT_WORD : IS_SAME_WORD;
            let segment = new Array(columnDiff[depthIndex].count).fill(pixelClass);
            if (!columnDiff[depthIndex].removed) {
                resultColumn = resultColumn.concat(segment);
            }
            // console.log('resultColumn>>',resultColumn.length,resultColumn);
            
            if (resultColumn.length > h) {
                console.log('WARNING -- this value can never be bigger than the native depth >>>>>>')
                debugger
            }
            if (resultColumn.length === h) {
                break;
            }
        }
        reducedColumns[columnIndex] = resultColumn;
    }
    // console.log('reducedColumns>>',reducedColumns);
    return reducedColumns;
}

function diffArr(refArr, testArr, h, w) {
    let rawResultArr = [];
    for (let i = 0; i < refArr.length; i++) {
        rawResultArr.push(JsDiff.diffArrays(refArr[i], testArr[i]));
    }
    return rawResultArr;
}

function imgDataWordArrToColsAndRows(arr, h, w) {
    let columns = new Array(w);
    let rows = new Array(h);

    for (var i = 0; i < arr.length; i++) {
        const word = arr[i];

        var {column, depth} = serialToColumnMap(i, h, w);
        if (!columns[column]) {
            columns[column] = new Array(h);
        }
        columns[column][depth] = word;
        
        var {row, index} = serialToRowMap(i, h, w);
        if (!rows[row]) {
            rows[row] = new Array(w);
        }
        rows[row][index] = word;
    }
    return {columns, rows}
}

function serialToColumnMap(index, h, w) {
    return {
        column: index % w, 
        depth: Math.floor(index / w)
    }
}

function serialToRowMap(index, h, w) {
    return {
        row: Math.floor(index / w), 
        index: index % w
    }
}

function imgDataToWords(arr) {
    let result = [];
    for (let i = 0; i < arr.length-1; i += 4) {
        result.push(`${arr[i]}_${arr[i+1]}_${arr[i+2]}_${arr[i+3]}`)
    }
    return result;
}

function wordToImgDataArr(word) {
    return word.split('_');
}

function getImgDataObjFromContext(context) {
    return context.getImageData(0, 0, context.canvas.width, context.canvas.height);
}

function getImgDataDataFromContext(context) {
    return context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
}

function getEmptyImgData(h, w) {
    var o = imageToCanvasContext(null, h, w);
    return o.createImageData(w, h);
}

function getEmptyImgContext(h, w) {
    var o = imageToCanvasContext(null, h, w);
    o.createImageData(w, h);
    return o;
}

function imageToCanvasContext(_img, w, h) {
    let img = _img;
    if (!_img) {
        img = { width: w, height: h };
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");
    if (_img) {
        context.drawImage(img, 0, 0);
    }
    return context;
}


