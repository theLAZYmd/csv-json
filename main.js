const Parse = require("./parse");

class Main {

    static parse (object) {
        try {
            return new Parse(object);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    static validate (arr) {
        let found = {};
        for (let a of arr) {
            if (!found[a]) found[a] = true;
            else return false;
        }
        return true;
    }

}

module.exports = Main;

Array.prototype.findIndex = function (f, startIndex = 0) { //same as Array.prototype.find() but returns an index. Like if .indexOf() took a function
    if (typeof f !== "function") return -1;
    if (startIndex >= this.length) throw "Invalid start index.";
    for (let i = startIndex; i < this.length; i++) {
        if (f(this[i])) {
            return i;
        }
    }
    return -1;
};

String.prototype.stripQuotes = function() {
    if (this.startsWith('"') && this.endsWith('"')) return this.slice(1, -1);
    return this;
};

Array.prototype.remove = function (index) { //remove an index or a set of indexes from an Array. Same as this.splice(index, 1) but allows for multi-index functionality
	if (index === 0) return;
	if (Array.isArray(index)) {
		for (let i of index.sort((a, b) => b - a)) {
			this.splice(i, 1);
		}
	} else {
		this.splice(index, 1);
	}
	return this;
};

Function.prototype.getInputs = function() {
    let str = this.toString().trim();
    let input;
    if (/^\(?([\w\s,]+)\)?\s*\=\>/.test(str)) input = str.match(/^\(?([\w\s,]+)\)?\s*\=\>/)[1];
    else if (/^function[\w\s+]\(([\w\s,]+)\)/.test(str)) input = str.match(/^function[\w\s+]\(([\w\s,]+)\)/)[1];
    if (!input) throw str;
    let inputs = input.split(",").map(i => i.trim());
    return inputs;
};