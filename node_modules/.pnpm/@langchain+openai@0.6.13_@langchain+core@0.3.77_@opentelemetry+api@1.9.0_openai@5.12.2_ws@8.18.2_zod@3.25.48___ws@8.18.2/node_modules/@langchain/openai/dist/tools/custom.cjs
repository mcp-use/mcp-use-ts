"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customTool = customTool;
const runnables_1 = require("@langchain/core/runnables");
const singletons_1 = require("@langchain/core/singletons");
const tools_1 = require("@langchain/core/tools");
function customTool(func, fields) {
    return new tools_1.DynamicTool({
        ...fields,
        description: "",
        metadata: {
            customTool: fields,
        },
        func: async (input, runManager, config) => new Promise((resolve, reject) => {
            const childConfig = (0, runnables_1.patchConfig)(config, {
                callbacks: runManager?.getChild(),
            });
            void singletons_1.AsyncLocalStorageProviderSingleton.runWithConfig((0, runnables_1.pickRunnableConfigKeys)(childConfig), async () => {
                try {
                    resolve(func(input, childConfig));
                }
                catch (e) {
                    reject(e);
                }
            });
        }),
    });
}
