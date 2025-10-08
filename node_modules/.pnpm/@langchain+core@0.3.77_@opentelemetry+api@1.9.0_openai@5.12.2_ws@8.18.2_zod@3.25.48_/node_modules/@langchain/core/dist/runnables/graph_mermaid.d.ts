import { Edge, Node } from "./types.js";
/**
 * Draws a Mermaid graph using the provided graph data
 */
export declare function drawMermaid(nodes: Record<string, Node>, edges: Edge[], config?: {
    firstNode?: string;
    lastNode?: string;
    curveStyle?: string;
    withStyles?: boolean;
    nodeColors?: Record<string, string>;
    wrapLabelNWords?: number;
}): string;
/**
 * @deprecated Use `drawMermaidImage` instead.
 */
export declare function drawMermaidPng(mermaidSyntax: string, config?: {
    backgroundColor?: string;
}): Promise<Blob>;
/**
 * Renders Mermaid graph using the Mermaid.INK API.
 *
 * @example
 * ```javascript
 * const image = await drawMermaidImage(mermaidSyntax, {
 *   backgroundColor: "white",
 *   imageType: "png",
 * });
 * fs.writeFileSync("image.png", image);
 * ```
 *
 * @param mermaidSyntax - The Mermaid syntax to render.
 * @param config - The configuration for the image.
 * @returns The image as a Blob.
 */
export declare function drawMermaidImage(mermaidSyntax: string, config?: {
    /**
     * The type of image to render.
     * @default "png"
     */
    imageType?: "png" | "jpeg" | "webp";
    backgroundColor?: string;
}): Promise<Blob>;
