class Stringify {

    constructor(object, replacer, options) {
        this.obj = object;
        this.headers = options ? options.headers ? options.headers : false : false;
        this.separator = options ? options.separator ? options.separator : "," : ",";
    }

    get obj () {
        if (this._obj) return this._obj;
        return "";
    }

    set obj (obj) {
        if (typeof obj === "object") obj = obj.string;
        if (typeof str !== "string") str = str.toString();  
        if (typeof str !== "string") throw "TypeError: typeof parse() input must be a string resolvable.";
        this._str = str;
    }

    set replacer (replacer) {
        if (replacer.length !== 2) throw "SyntaxError: replacer function expects (key, value) inputs.";
        let obj = {};
        for (let [key, value] of Object.entries(this.obj)) {
            let [k, v] = replacer(key, value);
            obj[k] = v;
        }
        return obj;
    }

    get nest () {
        if (this._nest) return this._nest;
        for (let element of Object.values(this.obj)) {
            if (!/^number|string|function$/.test(typeof element)) return true;
        }
        return false;
    }

    get simple () {
        return Object.values(this.ob).map(Stringify.text);
    }

    static text (lineArray) {
        let str = "";
        for (let item of lineArray) {
            let value = item.split(this.separator).join("\,").replace(/"/g, "'");
            str += `"` + value + `",`;
        }
        return str;
    }

}

module.exports = Stringify;