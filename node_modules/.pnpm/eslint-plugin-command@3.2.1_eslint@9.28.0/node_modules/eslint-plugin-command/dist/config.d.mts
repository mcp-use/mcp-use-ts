import { Linter } from 'eslint';
import { ESLintPluginCommandOptions } from './types.mjs';
import '@typescript-eslint/utils';

declare function config(options?: ESLintPluginCommandOptions): Linter.FlatConfig;

export { config as default };
