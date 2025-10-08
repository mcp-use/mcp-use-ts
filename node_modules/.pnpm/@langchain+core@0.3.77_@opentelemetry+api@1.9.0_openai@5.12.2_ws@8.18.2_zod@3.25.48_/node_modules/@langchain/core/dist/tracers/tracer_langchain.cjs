"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangChainTracer = void 0;
const langsmith_1 = require("langsmith");
const run_trees_1 = require("langsmith/run_trees");
const traceable_1 = require("langsmith/singletons/traceable");
const base_js_1 = require("./base.cjs");
const tracer_js_1 = require("../singletons/tracer.cjs");
class LangChainTracer extends base_js_1.BaseTracer {
    constructor(fields = {}) {
        super(fields);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "langchain_tracer"
        });
        Object.defineProperty(this, "projectName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "exampleId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "replicas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "usesRunTreeMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        const { exampleId, projectName, client, replicas } = fields;
        this.projectName = projectName ?? (0, langsmith_1.getDefaultProjectName)();
        this.replicas = replicas;
        this.exampleId = exampleId;
        this.client = client ?? (0, tracer_js_1.getDefaultLangChainClientSingleton)();
        const traceableTree = LangChainTracer.getTraceableRunTree();
        if (traceableTree) {
            this.updateFromRunTree(traceableTree);
        }
    }
    async persistRun(_run) { }
    async onRunCreate(run) {
        const runTree = this.getRunTreeWithTracingConfig(run.id);
        await runTree?.postRun();
    }
    async onRunUpdate(run) {
        const runTree = this.getRunTreeWithTracingConfig(run.id);
        await runTree?.patchRun();
    }
    getRun(id) {
        return this.runTreeMap.get(id);
    }
    updateFromRunTree(runTree) {
        this.runTreeMap.set(runTree.id, runTree);
        let rootRun = runTree;
        const visited = new Set();
        while (rootRun.parent_run) {
            if (visited.has(rootRun.id))
                break;
            visited.add(rootRun.id);
            if (!rootRun.parent_run)
                break;
            rootRun = rootRun.parent_run;
        }
        visited.clear();
        const queue = [rootRun];
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current || visited.has(current.id))
                continue;
            visited.add(current.id);
            this.runTreeMap.set(current.id, current);
            if (current.child_runs) {
                queue.push(...current.child_runs);
            }
        }
        this.client = runTree.client ?? this.client;
        this.replicas = runTree.replicas ?? this.replicas;
        this.projectName = runTree.project_name ?? this.projectName;
        this.exampleId = runTree.reference_example_id ?? this.exampleId;
    }
    getRunTreeWithTracingConfig(id) {
        const runTree = this.runTreeMap.get(id);
        if (!runTree)
            return undefined;
        return new run_trees_1.RunTree({
            ...runTree,
            client: this.client,
            project_name: this.projectName,
            replicas: this.replicas,
            reference_example_id: this.exampleId,
            tracingEnabled: true,
        });
    }
    static getTraceableRunTree() {
        try {
            return (
            // The type cast here provides forward compatibility. Old versions of LangSmith will just
            // ignore the permitAbsentRunTree arg.
            traceable_1.getCurrentRunTree(true));
        }
        catch {
            return undefined;
        }
    }
}
exports.LangChainTracer = LangChainTracer;
