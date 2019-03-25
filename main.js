const Parse = require('./parse');
const Stringify = require('./stringify');

/**
 * The main library object
 * @type {Object}
 */
class CSV {

    /**
     * 
     * @param {string} string 
     * @param {object} options
     * @example
     * //Parse a CSV file to an object
     * const text = `
     * index,name,time,timestamp
     * 1,andy,2018-13-25,02:14
     * `
     * CSV.parse(text, {
     *     hasHeaders: true
     * });
     * @returns {array|object}
     */
    static parse(string, options) {
        try {
            return new Parse(string, options);
        } catch (e) {
            if (e) console.error(e);
        }
    }

    static stringify(value, replacer, options) {
        try {
            return new Stringify(value, replacer, options);
        } catch (e) {
            if (e) console.error(e);
        }
    }

}

module.exports = CSV;