import { Rule } from 'eslint';

declare const messages: {
    insert: string;
    delete: string;
    replace: string;
};
declare function reportDifferences(context: Rule.RuleContext, source: string, formatted: string, offset?: number): void;

export { messages, reportDifferences };
