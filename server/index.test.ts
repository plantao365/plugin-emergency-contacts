import type { PluginContext, PluginJob } from '@plantao365/plugin-sdk';
import { describe, expect, it, vi } from 'vitest';
import plugin from './index.js';

/** Contexto falso: só o que o `setup` usa; `withSchema` devolve os ids "marcados" pelo SQL. */
async function activate(settings: Record<string, unknown>) {
  const queries: unknown[][] = [];
  const jobs: PluginJob[] = [];
  const tx = (_: TemplateStringsArray, ...params: unknown[]) => {
    queries.push(params);
    return Promise.resolve([{ id: 'c1' }]);
  };
  const info = vi.fn();
  await plugin.setup({
    settings,
    router: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    auth: { requireAuth: vi.fn(), requireRole: vi.fn() },
    events: { subscribe: vi.fn() },
    jobs: { register: (job: PluginJob) => jobs.push(job) },
    withSchema: (fn: (t: unknown) => unknown) => Promise.resolve(fn(tx)),
    logger: { info },
  } as unknown as PluginContext);
  return { queries, jobs, info };
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
