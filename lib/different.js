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
const smooth = .15;
function different(reference, test, h, w) {
    console.time("different_total_time");

    const spread = Math.floor(w*smooth)

    console.log('spread:', spread);

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

    console.time("columnWordDataToImgDataFormatAsWords");
    const convertedColumnDiffImgData = columnWordDataToImgDataFormatAsWords(expandedColumns, h, w);
    console.timeEnd("columnWordDataToImgDataFormatAsWords");
    // console.log("convertedColumnDiffImgData>>>", convertedColumnDiffImgData);

    console.time("imgDataWordsToClampedImgData");
    const imgDataArr = convertImgDataWordsToClampedImgData(convertedColumnDiffImgData);
    console.timeEnd("imgDataWordsToClampedImgData");
    // console.log("imgDataArr>>>", imgDataArr);

    console.timeEnd("different_total_time");

    return imgDataArr;
}

/**
 * ========= HELPERS ========
 */

function columnWordDataToImgDataFormatAsWords(columns, h, w) {
    const imgDataWordsLength = w * h;

    let convertedArr = new Array(imgDataWordsLength);
    for (var i = 0; i < imgDataWordsLength; i++) {
        const {column, depth} = serialToColumnMap(i, h, w);
        convertedArr[i] = columns[column][depth];
    }
    return convertedArr;
}

function convertImgDataWordsToClampedImgData(wordsArr) {
    let convertedArr = new Uint8ClampedArray(wordsArr.length * 4);
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

const IS_ADDED_WORD = '0_255_0_64';
const IS_REMOVED_WORD = '255_0_0_64';
const IS_ADDED_AND_REMOVED_WORD = '0_255_255_64';
const IS_SAME_WORD = '255_255_255_64';

function reduceColumnDiffRaw(columnDiffs, h, w) {
console.log("columnDiffs", columnDiffs)
    let reducedColumns = new Array(columnDiffs.length);
    for (let columnIndex = 0; columnIndex < columnDiffs.length; columnIndex++) {
        const columnDiff = columnDiffs[columnIndex];
        let resultColumn = new Array();
        let removedCounter = 0;
        let resultClass = '';

        for (let depthIndex = 0; depthIndex < h; depthIndex++) {
            let segmentLength = 0;


            if (columnDiff[depthIndex].removed) {
                segmentLength = columnDiff[depthIndex].count;
                removedCounter += segmentLength;
                resultClass = IS_REMOVED_WORD;
            } else {
                // resultClass = columnDiff[depthIndex].added ? IS_ADDED_WORD : IS_SAME_WORD;
                if (columnDiff[depthIndex].added) {
                    if (removedCounter) {
                        resultClass = IS_ADDED_AND_REMOVED_WORD;
                    } else {
                        resultClass = IS_ADDED_WORD;
                    }
                } else {
                    resultClass = IS_SAME_WORD;
                }


                segmentLength = columnDiff[depthIndex].count;

                if (removedCounter > 0) {
                    if (segmentLength > removedCounter) {
                        segmentLength -= removedCounter;
                        removedCounter = 0;
                    } else {
                        removedCounter -= segmentLength;
                        segmentLength = 0;
                    }
                }
            }

            if (!segmentLength) {
                continue;
            } else {
                segmentLength = Math.min(segmentLength, h - resultColumn.length);
            }

            let segment = new Array(segmentLength).fill(resultClass);
            resultColumn = resultColumn.concat(segment);
            
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
    if (!spread) {
        return columns;
    }
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
}

function ungroupAdjacent(grouped, spread, h, w) {
    if (!spread) {
        return grouped;
    }
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
            ungrouped[i][j] = grouped[translatedColumn][j];
         }
    }

    return ungrouped
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
