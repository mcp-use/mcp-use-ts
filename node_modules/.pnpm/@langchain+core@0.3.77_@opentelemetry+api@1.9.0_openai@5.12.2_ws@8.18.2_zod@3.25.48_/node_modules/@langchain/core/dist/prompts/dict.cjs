"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DictPromptTemplate = void 0;
const base_js_1 = require("../runnables/base.cjs");
const template_js_1 = require("./template.cjs");
class DictPromptTemplate extends base_js_1.Runnable {
    static lc_name() {
        return "DictPromptTemplate";
    }
    constructor(fields) {
        const templateFormat = fields.templateFormat ?? "f-string";
        const inputVariables = _getInputVariables(fields.template, templateFormat);
        super({ inputVariables, ...fields });
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "prompts", "dict"]
        });
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "template", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "templateFormat", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "inputVariables", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.template = fields.template;
        this.templateFormat = templateFormat;
        this.inputVariables = inputVariables;
    }
    async format(values) {
        return _insertInputVariables(this.template, values, this.templateFormat);
    }
    async invoke(values) {
        return await this._callWithConfig(this.format.bind(this), values, {
            runType: "prompt",
        });
    }
}
exports.DictPromptTemplate = DictPromptTemplate;
function _getInputVariables(template, templateFormat) {
    const inputVariables = [];
    for (const v of Object.values(template)) {
        if (typeof v === "string") {
            (0, template_js_1.parseTemplate)(v, templateFormat).forEach((t) => {
                if (t.type === "variable") {
                    inputVariables.push(t.name);
                }
            });
        }
        else if (Array.isArray(v)) {
            for (const x of v) {
                if (typeof x === "string") {
                    (0, template_js_1.parseTemplate)(x, templateFormat).forEach((t) => {
                        if (t.type === "variable") {
                            inputVariables.push(t.name);
                        }
                    });
                }
                else if (typeof x === "object") {
                    inputVariables.push(..._getInputVariables(x, templateFormat));
                }
            }
        }
        else if (typeof v === "object" && v !== null) {
            inputVariables.push(..._getInputVariables(v, templateFormat));
        }
    }
    return Array.from(new Set(inputVariables));
}
function _insertInputVariables(template, inputs, templateFormat) {
    const formatted = {};
    for (const [k, v] of Object.entries(template)) {
        if (typeof v === "string") {
            formatted[k] = (0, template_js_1.renderTemplate)(v, templateFormat, inputs);
        }
        else if (Array.isArray(v)) {
            const formattedV = [];
            for (const x of v) {
                if (typeof x === "string") {
                    formattedV.push((0, template_js_1.renderTemplate)(x, templateFormat, inputs));
                }
                else if (typeof x === "object") {
                    formattedV.push(_insertInputVariables(x, inputs, templateFormat));
                }
            }
            formatted[k] = formattedV;
        }
        else if (typeof v === "object" && v !== null) {
            formatted[k] = _insertInputVariables(v, inputs, templateFormat);
        }
        else {
            formatted[k] = v;
        }
    }
    return formatted;
}
