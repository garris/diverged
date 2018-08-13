'use strict';

const MEYERS_DIFF_ARRAY_METHOD = JsDiff.diffArrays;

/**
 * Applies meyers-diff algorithm to imageData formatted arrays
 * 
 * @param {imageDataArray} [reference] baseline image
 * @param {imageDataArray} [test] baseline image
 * 
 * @returns {imageDataArray} diff image
 * 
 */
const spread = 50;
function different(reference, test, h, w) {
    console.time("different_total_time");

    console.time("imgDataToWords");
    const img1wordArr = imgDataToWords(reference);
    const img2wordArr = imgDataToWords(test);
    console.timeEnd("imgDataToWords");

    console.time("imgDataWordArrToColsAndRows");
    let cols_rows_ref = imgDataWordArrToColsAndRows(img1wordArr, h, w);
    let cols_rows_test = imgDataWordArrToColsAndRows(img2wordArr, h, w);
    console.timeEnd("imgDataWordArrToColsAndRows");

    console.time("groupAdjacent");
    const columnRef = groupAdjacent(cols_rows_ref.columns, spread);
    const columnTest = groupAdjacent(cols_rows_test.columns, spread);
    console.timeEnd("groupAdjacent");

    console.time("columnDiffRaw");
    const columnDiffRaw = diffArr(columnRef, columnTest, h, w);
    console.timeEnd("columnDiffRaw");

    console.time("reduceColumnDiffRaw");
    const reducedColumnDiff = reduceColumnDiffRaw(columnDiffRaw, h, w);
    console.timeEnd("reduceColumnDiffRaw");
    // console.log("reducedColumnDiff>>>", reducedColumnDiff);
    
    console.time("unGroupAdjacent");
    const expandedColumns = ungroupAdjacent(reducedColumnDiff, spread, h, w);
    console.timeEnd("unGroupAdjacent");

    console.time("columnToImgDataWords");
    const convertedColumnDiffImgData = columnToImgDataWords(expandedColumns, h, w);
    console.timeEnd("columnToImgDataWords");
    // console.log("convertedColumnDiffImgData>>>", convertedColumnDiffImgData);

    console.time("imgDataWordsToImgData");
    const imgDataArr = convertImgDataWordsToImgData(convertedColumnDiffImgData);
    console.timeEnd("imgDataWordsToImgData");
    // console.log("imgDataArr>>>", imgDataArr);

    console.timeEnd("different_total_time");

    return imgDataArr;
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

        const columnDiff = columnDiffs[columnIndex];
        let resultColumn = new Array();
        for (let depthIndex = 0; depthIndex < h; depthIndex++) {
            
            const pixelClass = columnDiff[depthIndex].added || columnDiff[depthIndex].removed ? IS_DIFFERENT_WORD : IS_SAME_WORD;
            let segment = new Array(columnDiff[depthIndex].count).fill(pixelClass);
            if (!columnDiff[depthIndex].removed) {
                resultColumn = resultColumn.concat(segment);
            }
            
            if (resultColumn.length > h) {
                console.log('WARNING -- this value is out of bounds!')
                debugger;
            }

            if (resultColumn.length === h) {
                break;
            }
        }
        
        reducedColumns[columnIndex] = resultColumn;
    }

    return reducedColumns;
}

function diffArr(refArr, testArr, h, w) {
    let rawResultArr = [];
    for (let i = 0; i < refArr.length; i++) {
        rawResultArr.push(MEYERS_DIFF_ARRAY_METHOD(refArr[i], testArr[i]));
    }
    return rawResultArr;
}

function groupAdjacent(columns, spread) {
    const depth = columns[0].length;
    const countOfGroups = Math.floor(columns.length / spread);
    const lastGroupSpread = columns.length % spread;
    const groupedColumns = new Array(countOfGroups);

    function getGroupedDepthValue(columnIndex, depthIndex) {
        const length = (columnIndex === countOfGroups - 1) ? lastGroupSpread : spread;
        let result = new Array(length);
        for (let i = 0; i < length; i++) {
            result[i] = columns[columnIndex + i][depthIndex];
        }
        return result.join('|');
    }

    for (let i = 0; i <= countOfGroups; i++) {
        if (!groupedColumns[i]) {
            groupedColumns[i] = new Array(depth);
        }
        for (let j = 0; j < depth; j++) {
            groupedColumns[i][j] = getGroupedDepthValue(i, j);
        }
    }

    return groupedColumns;
    // return columns;
}

function ungroupAdjacent(grouped, spread, h, w) {
    const depth = h;
    const ungrouped = new Array(w);

    function ungroupedToGroupedColumnIndex(ungroupedIndex) {
        return Math.floor(ungroupedIndex / spread);
    }

    for (let i = 0; i < w; i++) {
         if (!ungrouped[i]) {
            ungrouped[i] = new Array(depth);
         }
         for (let j = 0; j < depth; j++) {
            let translatedColumn = ungroupedToGroupedColumnIndex(i);
            // console.log('i translated j ', i , translatedColumn , j)
            ungrouped[i][j] = grouped[translatedColumn][j];
         }
    }

    return ungrouped
    // return grouped;
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