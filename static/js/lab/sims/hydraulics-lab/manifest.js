import { HydraulicsLabApp } from './index.js';

/** @type {import('../../types.js').LabSimManifest} */
const manifest = {
  slug: 'hydraulics-lab',
  name: 'Hydraulics Lab',
  AppClass: HydraulicsLabApp,
  capabilities: {
    three: true,
    ai: true,
    fullscreen: true,
  },
  persistence: { namespace: 'hydraulics-lab', version: 1 },
  /**
   * Extra importmap entries required by this sim. The base template merges
   * these into the page's <script type="importmap"> via {% block extra_importmap %}.
   */
  extraImportmap: {
    '@dgreenheck/three-pinata': 'https://esm.sh/@dgreenheck/three-pinata@latest?external=three',
  },
  help: `
    <h3>Hydraulics Lab</h3>
    <ul>
      <li>Adjust pressure, piston diameter, and load to see how force transmits through fluid.</li>
      <li>Switch between SI and practical units from the toolbar.</li>
      <li>The pressure graph tracks the last 45 seconds of activity.</li>
      <li>Push past the safety limit to see destructive failure modes.</li>
    </ul>
  `,
};

export default manifest;
