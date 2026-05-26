/**
 * @lab/core — public barrel for the Lab framework's shared core.
 *
 * Sim modules should import everything they need from here using the logical
 * specifier '@lab/core' (resolved via the importmap declared in
 * templates/miniapps/_base_lab.html). Do not import './engine.js' directly
 * from sim code.
 */

export * from './engine.js';
export { Canvas2DStage } from './canvas2d-stage.js';
