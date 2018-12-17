class Parse {

    constructor(options) {
        if (typeof options !== "object") this.str = options;
        else this.str = options.string;
        if (typeof this.str !== "string") this.str = this.str.toString();  
        if (typeof this.str !== "string") throw "TypeError: typeof parse() input must be a string resolvable.";

        this.usedIndices = {};        
        this.separator = options.separator || ',';
        this.escape = options.escape || '"';
        this.untitledHeaders = options.untitledHeaders || 'untitled';
        this.hasHeaders = options.headers || false;
        this.allowNull = options.allowNull || false;
        this.correctDuplicates = options.correctDuplicates || false;
        this.force = options.force || false;
        if (options.type) this.type = options.type;
        if (options.skipColumns) this.skipColumns = options.skipColumns;
        if (options.numbers) this.numbers = options.numbers;
        if (options.index) this.index = options.index;
        return this.type === "array" ? Object.values(this.output) : this.output;
    }

    get type () {
        if (this._type) return this._type;
        return "array";
    }

    set type (typeResolvable) {
        if (Array.isArray(typeResolvable)) return 'array';
        if (typeof typeResolvable === 'object') return 'object';
        if (typeof typeResolvable !== 'string') throw 'TypeError: type specified must be "Array" or "Object".';
        if (!/^(array|object)$/i.test(typeResolvable)) throw 'TypeError: type specified must be "Array" or "Object".';
        return this._type = typeResolvable.match(/^(a(?:rray)|o(?:bject))$/i)[1].toLowerCase();
    }

    get index () {
        if (this._index !== undefined) return this._index;
        return undefined;
    }

    set index (indexResolvable) {
        if (typeof indexResolvable === "function") return this._index = indexResolvable;
        let index = this.resolveIndex(indexResolvable);
        let body = this.body;        
        if (indexResolvable > this.minLength) {
            let indices = body.map(line => line[index]);
            let j = 1;
            for (let i = 0; i < indices[i].length; i++) {
                if (indices[i] === undefined) {
                    if (!this.force) throw `SyntaxError: couldn't find index value for row ${i}. Use "force: true" in options to parse anyway, or modify data to correct.\n${this.body[i].join(",")}`;
                    while (indices.indexOf(j) !== -1) {
                        j++;
                    }
                    body[i][index] = j;
                }
            }
            this.body = body;
        }
        this._index = index;
    }

    get numbers () {
        if (this._numbers) return this._numbers;
        return [];
    }

    set numbers (numbersResolvable) {
        if (!Array.isArray(numbersResolvable)) throw 'TypeError: numbers must be an array of columns that are numbers';
        let numbers = numbersResolvable.map((n) => {
            let number = this.resolveIndex(n);
            for (let column of this.skipColumns.reverse()) {
                if (column === number) throw `Error: cannot both read column '${this.headers[n]}' as numbers and ignore column '${this.headers[n]}'`;
                if (column < number) number--;
            }
            return number;
        });
        return this._numbers = numbers;
    }

    get skipColumns () {
        if (this._skipColumns) return this._skipColumns;
        return [];
    }

    set skipColumns (columnsResolvable) {
        if (!Array.isArray(columnsResolvable)) throw 'TypeError: columns must be an array of columns that are numbers';
        return this._skipColumns = columnsResolvable.map(n => this.resolveIndex(n));
    }

    get rawLines() {
        if (this._rawLines) return this._rawLines;
        return this._rawLines = this.str.split('\n');
    }

    get splitLines() {//[["index", "name", "time", "timestamp"], ""
        if (this._splitLines) return this._splitLines;
        let splitLines = this.rawLines.map(line => line.trim().split(','));
        if (this.skipColumns.length > 0) splitLines = splitLines.map(arr => arr.remove(this.skipColumns));
        return this._splitLines = splitLines;
    }

    get mergeIndices() {
        if (this._mergeIndices) return this._mergeIndices;
        let mergeIndices = [];
        for (let [i, line] of Object.entries(this.splitLines)) {
            let indices = [];
            for (let [j, column] of Object.entries(line)) {
                if (column.startsWith(this.escape) && !column.endsWith(this.escape)) {
                    let index = line.findIndex(v => v.endsWith(this.escape), j);
                    if (index === -1) {
                        if (indices.length === 0) break;
                        throw `SyntaxError: unbalanced escape character on line ${i + 1} column ${j + 1}\n${line}`;
                    }
                    indices.push([j, index])
                }
            }
            mergeIndices.push(indices);
        }
        return this._mergeIndices = mergeIndices;
    }

    get lines () {
        if (this._lines) return this._lines;
        let lines = this.splitLines;
        if (lines.length !== this.mergeIndices.length) throw `CompileError: couldn't validate csv with escape character ${this.escape}`; //should never really be throwing an error
        for (let i = 0; i < this.mergeIndices.length; i++) {
            for (let [start, finish] of this.mergeIndices[i]) {
                let arr1 = lines[i].slice(0, start);
                let arr2 = lines[i].slice(start, finish + 1);
                let arr3 = lines[i].slice(finish + 1);
                lines[i] = [].concat(...arr1).concat(arr2.join(this.separator)).concat(...arr3);
            }
        }
        return this._lines = lines;
    }

    get headers() {
        if (this._headers) return this._headers;
        if (!this.hasHeaders) return this._headers = [];
        return this._headers = this.lines[0].map(header => header.trim().toString().stripQuotes());
    }

    get modifiedHeaders () {
        if (this._modifiedHeaders) return this._modifiedHeaders;
        let headers = this.headers;
        let i = 0;
        let constant = headers.length === 0 ? "" : this.untitledHeaders;
        while (headers.length < this.maxLength) {
            i++;
            if (headers.indexOf(i) !== -1) continue;
            headers.push(constant + i);
        }
        return this._modifiedHeaders = headers;
    }

    get body () {
        if (this._body) return this._body;
        let body = this.hasHeaders ? this.lines.slice(1) : this.lines;
        for (let i = 0; i < body.length; i++) {
            for (let j = 0; j < body[i].length; j++) {
                if (typeof body[i][j] !== "undefined") body[i][j] = body[i][j].toString().stripQuotes();
            }
        }
        return this._body = body;
    }

    set body (body) {
        this._body = body;
    }

    get minLength () {
        if (this._maxLength) return this._maxLength;        
        let maxLength = Math.max(...this.body.map(row => row.length));
        return this._maxLength = maxLength;
    }

    get maxLength () {
        if (this._maxLength) return this._maxLength;        
        let maxLength = Math.max(...this.body.map(row => row.length));
        if (this.headers.length !== 0 && this.headers.length !== maxLength && !this.force) {
            for (let i = 0; i < this.body.length; i++) {
                if (this.body[i].length > maxLength) throw `SyntaxError: extra column in row ${i + 1}. Use "force: true" in options to parse anyway, or modify data to correct.\n${this.body[i].join(",")}`
            }
        }
        return this._maxLength = maxLength;
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

    get output () {
        if (this._output) return this._output;
        return this.body.reduce((acc, curr, i) => {
            let obj = {};
            for (let j = 0; j < this.modifiedHeaders.length; j++) {
                if (curr[j] === undefined) {
                    obj[this.modifiedHeaders[j]] = curr[j];
                    continue;
                }
                let str = curr[j].toString();
                let toNumber = this.numbers.indexOf(j) !== -1;
                if (toNumber) {
                    let num = Number(str);
                    if (isNaN(num)) {
                        if (!this.allowNull) throw `SyntaxError: column '${this.modifiedHeaders[j]}' is given as numbers-only, but couldn't find number value at row ${i}. Use 'allowNull: true' to allow null entries in numbers columns to be copied over.\n${curr}}`;
                        obj[this.modifiedHeaders[j]] = str;
                    } else obj[this.modifiedHeaders[j]] = num;
                } else obj[this.modifiedHeaders[j]] = str;
            }
            let indexvalue = this.indices[i];
            acc[indexvalue.toString()] = obj;
            return acc;
        }, {});
    }

    resolveIndex(indexResolvable) {
        if (typeof indexResolvable === "number") {
            if (indexResolvable < 1) throw `SyntaxError: cannot read column '${indexResolvable}' for index of CSV file: CSV columns begin at '1'`;
            return indexResolvable - 1;
        } else
        if (typeof indexResolvable === "string") {
            if (!this.hasHeaders) throw `Error: cannot find index by header name when "headers: true" has not be given in options`
            let index = this.headers.indexOf(indexResolvable);
            if (index === -1) throw `Error: couldn't find header '${indexResolvable}', please specify a header name or a number.`;
            return index;
        } else
        if (typeof indexResolvable === "function") {
            return indexResolvable;
        } else throw 'TypeError: index specified must be a Number or String';
    }

    resolveKey(row) {
        if (this.index === undefined) return "";
        if (typeof this.index !== "function") return row[this.index];
        let keys = this.index.getInputs();
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

}

module.exports = Parse;