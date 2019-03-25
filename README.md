# CSV-JSON

CSV parser that is fast and functional, providing as many user options as possible.
Syntax to mimick that of JSON 3, using `CSV.parse()` and `CSV.stringify()` methods. `CSV.parse()` was successfully built.

```js
let CSV = require('csv-json');

const txt = `Column 1,Column 2,Column 3,Column 4
1-1,1-2,1-3,1-4
2-1,2-2,2-3,2-4
3-1,3-2,3-3,3-4
4,5,6,7`;

console.log(CSV.parse(txt), {
    hasHeaders: true
})

/*
[ { 'Column 1': '1-1',
    'Column 2': '1-2',
    'Column 3': '1-3',
    'Column 4': '1-4' },
  { 'Column 1': '2-1',
    'Column 2': '2-2',
    'Column 3': '2-3',
    'Column 4': '2-4' },
  { 'Column 1': '3-1',
    'Column 2': '3-2',
    'Column 3': '3-3',
    'Column 4': '3-4' },
  { 'Column 1': '4',
    'Column 2': '5',
    'Column 3': '6',
    'Column 4': '7' }
]
*/
```