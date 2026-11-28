import type { PluginContext, PluginJob } from '@plantao365/plugin-sdk';
import { describe, expect, it, vi } from 'vitest';
import plugin from './index.js';

const ROW = {
  id: 'c1',
  team_id: 't1',
  name: 'Plantão NOC',
  phone: '+55 11 4000-1234',
  role: 'Infra',
  notes: 'Senha do cofre com o líder',
  needs_review: false,
  reviewed_at: new Date('2026-11-01T10:00:00Z'),
  updated_at: new Date('2026-11-01T10:00:00Z'),
};

/** Contexto falso: só o que o `setup` usa; o SQL sempre devolve `ROW`. */
async function activate(settings: Record<string, unknown>) {
  const queries: unknown[][] = [];
  const jobs: PluginJob[] = [];
  const tx = (_: TemplateStringsArray, ...params: unknown[]) => {
    queries.push(params);
    return Promise.resolve([ROW]);
  };
  const info = vi.fn();
  const get = vi.fn();
  await plugin.setup({
    settings,
    router: { get, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    auth: { requireAuth: vi.fn(), requireRole: vi.fn() },
    events: { subscribe: vi.fn() },
    jobs: { register: (job: PluginJob) => jobs.push(job) },
    withSchema: (fn: (t: unknown) => unknown) => Promise.resolve(fn(tx)),
    logger: { info },
  } as unknown as PluginContext);
  return { queries, jobs, info, get };
}

describe('revisão de contatos', () => {
  it('marca os vencidos já na ativação, com o prazo configurado, e de novo no job', async () => {
    const { queries, jobs, info } = await activate({ reviewDays: 30 });
    expect(queries).toEqual([[30]]);
    expect(info).toHaveBeenCalledWith({ marked: 1 }, 'Contatos marcados para revisão');

    expect(jobs.map((j) => j.name)).toEqual(['review']);
    await jobs[0]!.run();
    expect(queries).toEqual([[30], [30]]);
  });
});

describe('GET /contacts', () => {
  it.each([
    ['manager', true],
    ['member', false],
    ['guest', false],
  ])('%s recebe as observações: %s', async (role, sees) => {
    const { get } = await activate({});
    const handler = get.mock.calls.find(([path]) => path === '/contacts')!.at(-1);
    const vars: Record<string, unknown> = { teamId: 't1', user: { role } };
    const { contacts } = await handler({
      get: (key: string) => vars[key],
      json: (body: unknown) => body,
    });
    expect(contacts[0].name).toBe(ROW.name);
    expect('notes' in contacts[0]).toBe(sees);
  });
});
