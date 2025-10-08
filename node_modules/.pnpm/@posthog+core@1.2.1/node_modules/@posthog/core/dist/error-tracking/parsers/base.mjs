import { isUndefined } from "../../utils/index.mjs";
const UNKNOWN_FUNCTION = '?';
const OPERA10_PRIORITY = 10;
const OPERA11_PRIORITY = 20;
const CHROME_PRIORITY = 30;
const WINJS_PRIORITY = 40;
const GECKO_PRIORITY = 50;
function createFrame(filename, func, lineno, colno) {
    const frame = {
        platform: "web:javascript",
        filename,
        function: '<anonymous>' === func ? UNKNOWN_FUNCTION : func,
        in_app: true
    };
    if (!isUndefined(lineno)) frame.lineno = lineno;
    if (!isUndefined(colno)) frame.colno = colno;
    return frame;
}
export { CHROME_PRIORITY, GECKO_PRIORITY, OPERA10_PRIORITY, OPERA11_PRIORITY, UNKNOWN_FUNCTION, WINJS_PRIORITY, createFrame };
