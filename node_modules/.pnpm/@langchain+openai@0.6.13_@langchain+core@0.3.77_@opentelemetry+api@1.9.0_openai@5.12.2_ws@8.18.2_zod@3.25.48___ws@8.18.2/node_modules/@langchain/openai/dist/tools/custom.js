import { patchConfig, pickRunnableConfigKeys, } from "@langchain/core/runnables";
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";
import { DynamicTool } from "@langchain/core/tools";
export function customTool(func, fields) {
    return new DynamicTool({
        ...fields,
        description: "",
        metadata: {
            customTool: fields,
        },
        func: async (input, runManager, config) => new Promise((resolve, reject) => {
            const childConfig = patchConfig(config, {
                callbacks: runManager?.getChild(),
            });
            void AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(childConfig), async () => {
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
