/**
 * Shared JSDoc typedefs for the Lab framework.
 *
 * Importing this module has no runtime side effects; it exists purely so
 * IDEs (and `// @ts-check` files) can resolve `@typedef` references via:
 *
 *   /** @typedef {import('../types.js').LabSim} LabSim *\/
 */

/**
 * @typedef {Object} LabSimCapabilities
 * @property {boolean} [three]  Sim uses Three.js (requires Three importmap).
 * @property {boolean} [twoD]   Sim renders with 2D canvas only.
 * @property {boolean} [ai]     Sim opts into the AI voice assistant.
 * @property {boolean} [fullscreen] Sim supports the fullscreen toggle.
 */

/**
 * Contract every sim's main App class must satisfy. Methods marked optional
 * are detected at runtime by LabShell and skipped when absent.
 *
 * @typedef {Object} LabSim
 * @property {() => (Promise<void>|void)} init       Required. Boot the sim.
 * @property {() => Object} getState                 Required. Snapshot for AI / debug overlay.
 * @property {() => void} dispose                    Required. Tear down listeners, RAFs, WebGL.
 * @property {() => void} [pause]                    Optional. Called on tab hide.
 * @property {() => void} [resume]                   Optional. Called on tab show.
 * @property {(w:number, h:number) => void} [onResize] Optional. Stage size changed.
 */

/**
 * Per-sim manifest. Each sim folder exports one of these from manifest.js.
 *
 * @typedef {Object} LabSimManifest
 * @property {string} slug              Matches MiniApp.slug.
 * @property {string} name              Human-readable name.
 * @property {new (containerId:string)=>LabSim} AppClass
 * @property {LabSimCapabilities} [capabilities]
 * @property {{ namespace?: string, version?: number }} [persistence]
 * @property {string[]} [assets]        Optional list of asset URLs to preload.
 * @property {string} [help]            Optional HTML for the help overlay.
 */

export {};
