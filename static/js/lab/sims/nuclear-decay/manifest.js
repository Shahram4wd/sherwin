import { NuclearDecayApp } from './index.js';

/** @type {import('../../types.js').LabSimManifest} */
const manifest = {
  slug: 'nuclear-decay',
  name: 'Nuclear Decay Lab',
  AppClass: NuclearDecayApp,
  capabilities: {
    three: true,
    ai: true,
    fullscreen: true,
  },
  persistence: { namespace: 'nuclear-decay', version: 1 },
  help: `
    <h3>Nuclear Decay Lab</h3>
    <ul>
      <li>Use the protons/neutrons sliders to build a nucleus.</li>
      <li>The stability bar turns red when the nucleus is unstable.</li>
      <li>Click <em>Trigger Decay</em> to watch alpha, beta, gamma emissions.</li>
      <li>Pick a preset isotope from the dropdown to jump to a famous nucleus.</li>
      <li>Open the AI assistant for guided explanations.</li>
    </ul>
  `,
};

export default manifest;
