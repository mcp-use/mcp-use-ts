import { Rule } from 'eslint';

interface RuleModule<T extends readonly unknown[]> extends Rule.RuleModule {
    defaultOptions: T;
}

declare const _default: {
    meta: {
        name: string;
        version: string;
    };
    rules: {
        command: RuleModule<[]>;
    };
};

export { _default as default };
