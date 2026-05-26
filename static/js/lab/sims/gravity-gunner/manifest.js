import { GravityGunnerApp } from './index.js';

/** @type {import('../../types.js').LabSimManifest} */
const manifest = {
  slug: 'gravity-gunner',
  name: 'Gravity Gunner',
  AppClass: GravityGunnerApp,
  capabilities: {
    twoD: true,
    ai: true,
    fullscreen: true,
  },
  persistence: { namespace: 'gravity-gunner', version: 1 },
  help: `
    <h3>Gravity Gunner</h3>
    <ul>
      <li>Drag from your ship to aim. Length = power, angle = launch angle.</li>
      <li>Projectiles curve through nearby gravity wells — use them as slingshots.</li>
      <li>Hit every enemy before your shields drop to zero.</li>
      <li>Use the level selector to replay specific stages.</li>
    </ul>
  `,
};

export default manifest;
