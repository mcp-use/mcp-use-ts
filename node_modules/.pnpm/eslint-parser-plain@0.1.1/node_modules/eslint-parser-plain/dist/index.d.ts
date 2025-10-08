declare const parseForESLint: (code: string) => {
    ast: {
        type: string;
        loc: {
            start: number;
            end: number;
        };
        range: number[];
        body: never[];
        comments: never[];
        tokens: never[];
    };
    services: {
        isPlain: boolean;
    };
    scopeManager: null;
    visitorKeys: {
        Program: never[];
    };
};
declare const meta: {
    name: string;
    version: string;
};

export { meta, parseForESLint };
