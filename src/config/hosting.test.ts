import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const buildSpec = readFileSync(new URL('../../amplify.yml', import.meta.url), 'utf8');

describe('Amplify Hosting build', () => {
  it('installs transcription dependencies before checking or deploying the backend', () => {
    const install = buildSpec.indexOf('npm ci --prefix amplify/functions/sales-meeting-transcription --legacy-peer-deps');
    const typecheck = buildSpec.indexOf('cd amplify && npx tsc');
    const deploy = buildSpec.indexOf('npx ampx pipeline-deploy');

    expect(install).toBeGreaterThan(-1);
    expect(typecheck).toBeGreaterThan(install);
    expect(deploy).toBeGreaterThan(typecheck);
  });

  it('serves sold CSV files as static assets while rewriting dashboard routes', () => {
    const source = buildSpec.match(/source: <\/(.+)\/>/);
    expect(source).not.toBeNull();
    const rewrite = new RegExp(source![1]);

    for (const year of ['2024', '2025']) {
      expect(rewrite.test(`/data/cpc_sold_${year}.csv`)).toBe(false);
      expect(rewrite.test(`/completed-projects/${year}-sold`)).toBe(true);
    }
    expect(rewrite.test('/completed-projects')).toBe(true);
    expect(rewrite.test('/assets/index.js')).toBe(false);
    expect(rewrite.test('/assets/index.css')).toBe(false);
  });
});
