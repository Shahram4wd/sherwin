import { TankAttackLabApp } from './index.js';

/** @type {import('../../types.js').LabSimManifest} */
const manifest = {
  slug: 'tank-attack-lab',
  name: 'Tank Attack Lab',
  AppClass: TankAttackLabApp,
  capabilities: {
    three: true,
    ai: true,
    fullscreen: true,
  },
  persistence: { namespace: 'tank-attack-lab', version: 1 },
  help: `
    <h3>Tank Attack Lab</h3>
    <ul>
      <li>Adjust elevation and muzzle velocity to hit enemy tanks.</li>
      <li>Watch trajectory ghosts before firing for free practice shots.</li>
      <li>Your best scores per cluster are saved locally.</li>
      <li>Ask the AI assistant for ballistic tips.</li>
    </ul>
  `,
};

export default manifest;
