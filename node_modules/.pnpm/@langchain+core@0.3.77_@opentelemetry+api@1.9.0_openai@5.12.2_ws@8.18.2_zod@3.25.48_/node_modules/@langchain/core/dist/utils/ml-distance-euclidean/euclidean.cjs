"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.squaredEuclidean = squaredEuclidean;
exports.euclidean = euclidean;
function squaredEuclidean(p, q) {
    let d = 0;
    for (let i = 0; i < p.length; i++) {
        d += (p[i] - q[i]) * (p[i] - q[i]);
    }
    return d;
}
function euclidean(p, q) {
    return Math.sqrt(squaredEuclidean(p, q));
}
