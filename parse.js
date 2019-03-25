'use strict';

/**
 * The constructor for CSV.parse(); copies the syntax for JSON.parse()
 * @constructor
 * @param {stringResolvable} str - The raw CSV string to be parsed to a JavaScript object
 * @param {[ParseOptions]} options - set of optional parameters to specify custom input data or change format of output data
 */
class Parse {

    constructor(str, options = {}) {
        this.str = str;
        this.usedIndices = {};
        for (let key of Object.keys(Parse.def)) {
            this[key] = options[key] !== undefined ? options[key] : Parse.def[key];
        }
        return this.type === "array" ? Object.values(this.output) : this.output;
    }

    static get def () {
        if (Parse._def) return Parse._def;
        let def = {
            separator: ",",
            escape: '"',
            untitledHeaders: "untitled",
            hasHeaders: false,
            allowNull: true,
            type: "array",
            skipColumns: [],
            numberOnly: [],
            
            correctDuplicates: false,
            index: undefined
        }
        return Parse._def = def;

        /**
         * Options for using the Parse method
         * @typedef {Object} ParseOptions
         * @property {string} [separator=def.separator] The separator character for columns within a row
         * @property {string} [escape=def.escape] The escape character to use as quotes around a whole cell containing the separator character
         * @property {string} [untitledHeaders=def.untitledHeaders] What to name any columns without a header, assuming the output type is to be an object
         * @property {boolean} [hasHeaders=def.hasHeaders] Whether the first line of the CSV file has its own headers
         * @property {boolean} [allowNull=def.allowNull]
         * @property {boolean} [correctDuplicates=def.correctDuplicates]
         * @property {boolean} [force=def.force]
         * @property {typeResolvable} [type=def.type] The output type
         * @property {number[]} [skipColumns=def.skipColumns]
         * @property {number[]} [numberOnly=def.numberOnly] List of columns to validate as being full of numbers only
         * @property {indexResolvable} [index=def.index]
         */
    }

    /**
     * Inherent properties of the string input
     * Parse data ready for reformatting
     */

    /**
     * String input value to the parse constructor
     * Input is stringResolvable - can be object with string property, buffer, number, boolean, or string
     */
    get str () {
        if (this._str) return this._str;
        return "";
    }

    set str (str) {
        if (typeof str === "object") str = str.string;
        if (typeof str !== "string") str = str.toString();  
        if (typeof str !== "string") throw "TypeError: typeof parse() input must be a string resolvable.";
        this._str = str.replace(/\r/g, "");
    }
    
    /**
     * String lines split by newline
     * Should produce an array of each row in the CSV
     * @private
     */
    get rawLines() {
        if (this._rawLines) return this._rawLines;
        return this._rawLines = this.str.split('\n');
    }

    /**
     * Splits each row by the ',' separator
     * Any columns which the user specifies to skip are skipped
     * @private
     * @example
     * [["index", "name", "time", "timestamp"], ["1", "andy", "2019-03-25", "01:15"]]
     */
    get splitLines() {
        if (this._splitLines) return this._splitLines;
        let splitLines = this.rawLines.map(line => line.trim().split(this.separator));
        if (this.skipColumns.length > 0) splitLines.forEach(arr => this.skipColumns.forEach(i => arr.splice(i, 1)));
        return this._splitLines = splitLines;
    }

/**
 * Runs through the rows crudely split by this.splitLines and returns the indices that need to be joined on account of the escape characters
 * @private
 * @example[[[0, 1], [3, 5]], [[0, 1], [3, 6]]
 */
get mergeIndices() {
    if (this._mergeIndices) return this._mergeIndices;
    let mergeIndices = this.splitLines.map((line, i) => {
        let indices = new Map();
        let start = null;
        line.forEach((cell, j) => {
            try {
                if (cell.startsWith(this.escape)) {
                    if (typeof start === "number") throw "double start";
                    if (cell.endsWith(this.escape)) return;
                    start = j;
                } else
                if (cell.endsWith(this.escape)) {
                    if (typeof start !== "number") throw "double end";
                    indices.set(start, j);
                    start = null;
                }
                if (j >= line.length - 1 && typeof start === "number") throw "unfinished end";
            } catch (e) {
                console.error(Array.from(indices.entries()));
                if (e) throw new SyntaxError(`unbalanced escape character (${e}) on line ${i + 1} column ${j + 1}\n${line}`);
            }
        });
        return Array.from(indices.entries());
    })
    return this._mergeIndices = mergeIndices;
}

    /**
     * Merges the escaped value cells together from splitLines to produce a finalised 2D Array of rows and columns
     * Represents the table in 2D Array form
     * @public
     */
    get lines () {
        if (this._lines) return this._lines;        
        let lines = this.splitLines;
        for (let i = 0; i < this.mergeIndices.length; i++) {
            for (let [start, finish] of this.mergeIndices[i]) {
                let arr1 = lines[i].slice(0, start);
                let arr2 = lines[i].slice(start, finish + 1);
                let arr3 = lines[i].slice(finish + 1);
                lines[i] = [].concat(arr1, [arr2.join(this.separator)], arr3);
            }
        }
        return this._lines = lines;
    }
    
    /**
     * Slices off the first line of the CSV and turns it into the object's headers, unless options.hasHeaders is set to false, in which case returns no headers.
     * @returns {string[]} Must have unique string values
     * @private
     */
    get rawHeaders() {
        if (this._rawHeaders) return this._rawHeaders;
        if (!this.hasHeaders) return this._rawHeaders = [];
        return this._rawHeaders = this.lines[0].map(header => this.stripEscape(header.trim().toString()));
    }

    /**
     * Lengthens out the headers so that all columns are given a header. If user didn't include table headers, numberOnly are used.
     * @returns {string[]} An array the length of the longest row in the table with full and unique header names
     * @private
     */
    get headers () {
        if (this._headers) return this._headers;
        let headers = this.rawHeaders;
        console.log(headers);
        headers.reduce((acc, curr, i) => {
            if (acc[curr]) throw new SyntaxError("Duplicate header " + curr + "specified in columns " + (acc[curr] + 1) + " and " + i);
            acc[curr] = i;
            return acc;
        }, {})
        let constant = headers.length ? this.untitledHeaders : "";
        let i = 0;
        while (headers.length < this.maxLength) {
            i++;
            if (headers.indexOf(constant + i.toString()) !== -1) continue;     //generates unique key names
            headers.push(constant + i.toString());
        }
        return this._headers = headers;
    }
    
    /**
     * Grabs the main table from this.lines. Runs through each cell and removes extraneous quote marks from any 
     */
    get body () {
        if (this._body) return this._body;
        let body = this.lines.slice(this.hasHeaders ? 1 : 0);
        for (let i = 0; i < body.length; i++) {
            for (let j = 0; j < body[i].length; j++) {
                if (typeof body[i][j] !== "string") continue;
                body[i][j] = this.stripEscape(body[i][j].toString().trim());
                if (this.numberOnly[j]) {
                    body[i][j] = Number(body[i][j]);
                    if (isNaN(body[i][j])) throw new SyntaxError(`column '${this.headers[j]}' is given as numberOnly, but couldn't find number value at row ${i}.\n${body[i]}}`);
                }
            }
        }
        return this._body = body;
    }

    set body (body) {
        this._body = body;
    }

    get output () {
        if (this._output) return this._output;
        return this.body.reduce((acc, line, i) => {
            let obj = {};
            for (let j = 0; j < this.maxLength; j++) {
                obj[this.headers[j]] = line[j];
            }
            let indexvalue = this.indices[i];
            acc[indexvalue.toString()] = obj;
            return acc;
        }, {});
    }

    /**
     * Parameter properties of the parse input
     * These are each lazy loaded at some point and called by the above methods
     */

    /**
     * @returns {string} "array"|"Object"
     * @default "array"
     */
    get type () {
        return this._type;
    }

    /**
     * Function to resolve type parameter into a value of type for output
     * @typedef {Array|Object|string} typeResolvable
     * @returns {string} array|object
     */
    set type (typeResolvable) {
        if (Array.isArray(typeResolvable)) return 'array';
        if (typeof typeResolvable === 'object') return 'object';
        if (typeof typeResolvable !== 'string') throw new TypeError('Type parameter must be Array or Object');
        if (!/^(array|object)$/i.test(typeResolvable)) throw 'TypeError: type specified must be "Array" or "Object".';
        return this._type = typeResolvable.match(/^(a(?:rray)|o(?:bject))$/i)[1].toLowerCase();
    }

    get index () {
        return this._index;
    }

    /**
     * A value for specifying a column. Can be done by a column name, a column number, or a function identifying the column for each row.
     * @typedef {function|number|string} indexResolvable
     */
    set index (indexResolvable) {
        if (typeof indexResolvable === "function") return this._index = indexResolvable;
        let index = this.resolveIndex(indexResolvable);
        let body = this.body;        
        if (indexResolvable > this.minLength) {
            let indices = body.map(line => line[index]);
            let j = 1;
            for (let i = 0; i < indices[i].length; i++) {
                if (indices[i] === undefined) {
                    if (!this.force) throw new RangeError(`couldn't find index value for row ${i}. Use "force: true" in options to parse anyway, or modify data to correct.\n${this.body[i].join(",")}`);
                    while (indices.indexOf(j) !== -1) j++;
                    body[i][index] = j;
                }
            }
            this.body = body;
        }
        this._index = index;
    }

    /**
     * Function to resolve function, number, or string to column index value
     * @param {indexResolvable} indexResolvable
     * @returns {number}
     */
    resolveIndex(indexResolvable) {
        switch (typeof indexResolvable) {
            case ("number"):
                if (indexResolvable < 1) throw new RangeError(`cannot read column '${indexResolvable}' for index of CSV file: CSV columns begin at '1'`);
                return indexResolvable - 1;
            case("string"):
                if (!this.hasHeaders) throw new Error(`cannot find index by header name when "hasHeaders: true" has not be given in options`)
                let index = this.headers.indexOf(indexResolvable);
                if (index === -1) throw new Error(`couldn't find header '${indexResolvable}', please specify a header name or a number.`);
                return index;
            case ("function"):
                return indexResolvable;
            default:
                throw new TypeError('index specified must be a Number or String');
        }
    }

    /**
     * @returns {boolean[]}
     */
    get numberOnly () {
        if (this._numberOnly) return this._numberOnly;
    }

    /**
     * Because the ignored columns get skipped over in the count, the numberOnly array needs to be modified to reduce for each skipped column
     * @typedef {number[]} numberOnlyResolvable
     */
    set numberOnly (numberOnlyResolvable) {
        if (!Array.isArray(numberOnlyResolvable)) throw new TypeError();
        let arr = numberOnlyResolvable.map((n) => {
            let number = this.resolveIndex(n);
            for (let column of this.skipColumns.reverse()) {
                if (column === number) throw new Error(`cannot both read column '${this.headers[n]}' as numberOnly and ignore it`);
                if (column < number) number--; 
            }
            return number;
        });
        let numberOnly = new Array(this.maxLength);
        for (let i of arr) numberOnly[i] = true;
        for (let i = 0; i < this.maxLength; i++) if (!numberOnly[i]) numberOnly[i] = false;
        return this._numberOnly = numberOnly;
    }

    /**
     * @returns {number[]}
     */
    get skipColumns () {
        if (this._skipColumns) return this._skipColumns;
    }

    set skipColumns (columnsResolvable) {
        if (!Array.isArray(columnsResolvable) || !columnsResolvable.every(c => typeof c === "number")) throw new TypeError('columns must be an array of columns that are numberOnly');
        return this._skipColumns = columnsResolvable.map(n => n--); //maps them a
    }

    /**
     * @private
     */
    get lengths() {
        if (this._lengths) return this._lengths;
        return this._lengths = this.lines.map(row => row.length);
    }

    /**
     * Returns the minimum number of columns in the CSV data-set for each row
     */
    get minLength () {
        if (this._minLength) return this._minLength;        
        return this._minLength = Math.min(...this.lengths);
    }

    /**
     * Returns the maximum number of columns in the CSV data-set for each row. Throws an error if any are found and user specified not to allow undefined/null values
     */
    get maxLength () {
        if (this._maxLength) return this._maxLength;
        let maxLength = Math.max(...this.lengths);
        if (this.allowNull === false && maxLength !== this.minLength) {
            let row = this.body.find(row => row.length > this.minLength);
            throw new Error(`extra column in row ${row.length + 1}. Use "allowNull: true" in options to parse anyway, or modify data to correct.\n${row.join(",")}`);
        };
        return this._maxLength = maxLength;
    }
    
    /**
     * Private methods called within the instance
     */

    /**
     * Removes extraneous escape characters from a given cell (string value)
     * @param {string} str
     * @private
     */
    stripEscape(str) {
        if (typeof (str) !== "string") return str;
        let regex = new RegExp(`^${this.escape}*([^${this.escape}]*)${this.escape}*$`)
        return str.match(regex)[1] || "";
    }

    get indices () {
        if (this._indices) return this._indices;
        if (this.index === undefined || this.type === "array") return this._indices = Array.from({length: this.body.length}, (x, i) => i);
        let validator = {};
        return this._indices = this.body.map((curr, i) => {
            let index = this.resolveKey(curr);
            if (!this.correctDuplicates) {
                if (validator[index]) throw `SyntaxEror: Couldn't ${this.index !== undefined ? "use '" + index + "'" : "generate iterators"} as index because of duplicate index values at rows ${validator[index]} and ${i}. Use 'correctDuplicates: true' to automatically generate indices for duplicates.`;
                else {
                    validator[index] = i;
                    return index;
                }
            } else {
                if (!validator[index]) validator[index] = 1;
                else validator[index]++;
                return index + "-" + validator[index];
            }
        });
    }

    resolveKey(row) {
        if (this.index === undefined) return "";
        if (typeof this.index !== "function") return row[this.index];
        let keys = Parse.getInputs(this.index);
        let args = keys.map((input) => {
            if (input === "iterator") return "";
            return row[this.resolveIndex(input)];
        });
        let iterator;
        if (keys.indexOf("iterator") !== -1) {
            let raw = this.index(...args);
            if (!this.usedIndices[raw]) this.usedIndices[raw] = 1;
            else this.usedIndices[raw]++;
            iterator = this.usedIndices[raw];
        }
        let args2 = keys.map((input) => {
            if (input === "iterator") return iterator;
            return row[this.resolveIndex(input)];
        });
        let index = this.index(...args2);
        return index;
    }

    static getInputs (f) {
        if (typeof f !== "function") throw new TypeError();
        let str = f.toString().trim();
        let input;
        if (/^\(?([\w\s,]+)\)?\s*\=\>/.test(str)) input = str.match(/^\(?([\w\s,]+)\)?\s*\=\>/)[1];
        else if (/^function[\w\s+]\(([\w\s,]+)\)/.test(str)) input = str.match(/^function[\w\s+]\(([\w\s,]+)\)/)[1];
        if (!input) throw str;
        let inputs = input.split(",").map(i => i.trim());
        return inputs;
    }

}

module.exports = Parse;