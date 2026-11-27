// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { registerWebSdk, type Role } from '@diovanibmotta/plantao365-web-sdk';
import { ContactForm } from './ContactForm';
import { ContactsList } from './ContactsList';
import { ProfileContacts } from './ProfileContacts';
import type { Contact } from './types';

const contact = (id: string, name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  teamId: 't1',
  name,
  phone: '+55 11 4000-1234',
  role: 'Infra',
  notes: '',
  needsReview: false,
  reviewedAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...over,
});

const NOC = contact('c1', 'Plantão NOC');
const DBA = contact('c2', 'DBA de sobreaviso', { role: 'Banco', needsReview: true });

class NotFound extends Error {}

/** Host falso: api e papel registrados no web-sdk, como o app faz. */
function setupHost(role: Role, routes: Record<string, unknown>) {
  const calls: [string, string, unknown?][] = [];
  const reply = <T,>(method: string, path: string, body?: unknown): Promise<T> => {
    calls.push([method, path, body]);
    const key = `${method} ${path}`;
    const value = key in routes ? routes[key] : {};
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value as T);
  };
  registerWebSdk({
    api: {
      get: (path) => reply('GET', path),
      post: (path, body) => reply('POST', path, body),
      put: (path, body) => reply('PUT', path, body),
      patch: (path, body) => reply('PATCH', path, body),
      delete: (path) => reply('DELETE', path),
    },
    toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
    useActiveTeam: () => ({ id: 't1', name: 'Infra' }),
    useRole: () => role,
  });
  return { writes: () => calls.filter(([m]) => m !== 'GET') };
}

const API = '/api/extensions/emergency-contacts';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/ext/emergency-contacts" element={<ContactsList />} />
        <Route path="/ext/emergency-contacts/new" element={<ContactForm />} />
        <Route path="/ext/emergency-contacts/:id" element={<ContactForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('listagem de contatos', () => {
  it('gestor vê CTA e Editar; busca sem acento e filtra os a revisar', async () => {
    setupHost('manager', { [`GET ${API}/contacts`]: { contacts: [NOC, DBA] } });
    const user = userEvent.setup();
    renderAt('/ext/emergency-contacts');
    const table = await screen.findByRole('table', { name: 'Contatos de emergência' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Novo contato' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Editar Plantão NOC' })).toBeTruthy();
    expect(within(table).getByText('Revisar')).toBeTruthy();

    await user.type(screen.getByPlaceholderText(/Buscar por nome/), 'plantao');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await user.click(screen.getByLabelText('Só a revisar'));
    expect(within(table).getAllByRole('row').slice(1)[0]!.textContent).toContain('DBA');
  });

  it('membro só consulta: sem CTA nem Editar', async () => {
    setupHost('member', { [`GET ${API}/contacts`]: { contacts: [NOC] } });
    renderAt('/ext/emergency-contacts');
    await screen.findByRole('table', { name: 'Contatos de emergência' });
    expect(screen.queryByRole('link', { name: 'Novo contato' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Editar/ })).toBeNull();
  });

  it('vazio mostra o EmptyState com o CTA, sem barra de filtro', async () => {
    setupHost('manager', { [`GET ${API}/contacts`]: { contacts: [] } });
    renderAt('/ext/emergency-contacts');
    expect(await screen.findByText(/Nenhum contato de emergência/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Novo contato' })).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Buscar por nome/)).toBeNull();
  });
});

describe('formulário de contato', () => {
  it('valida no cliente e cria', async () => {
    const host = setupHost('manager', { [`GET ${API}/contacts`]: { contacts: [] } });
    const user = userEvent.setup();
    renderAt('/ext/emergency-contacts/new');
    await user.click(await screen.findByRole('button', { name: 'Salvar' }));
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'Informe o nome.',
      'Informe o telefone.',
    ]);
    expect(host.writes()).toEqual([]);

    await user.type(screen.getByLabelText(/^Nome/), 'Plantão NOC');
    await user.type(screen.getByLabelText(/^Telefone/), '+55 11 4000-1234');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(host.writes()).toEqual([
        [
          'POST',
          `${API}/contacts`,
          { name: 'Plantão NOC', phone: '+55 11 4000-1234', role: '', notes: '' },
        ],
      ]),
    );
    expect(await screen.findByText(/Nenhum contato de emergência/)).toBeTruthy();
  });

  it('edita e exclui só após confirmar', async () => {
    const host = setupHost('manager', {
      [`GET ${API}/contacts/c1`]: { contact: NOC },
      [`GET ${API}/contacts`]: { contacts: [] },
    });
    const user = userEvent.setup();
    renderAt('/ext/emergency-contacts/c1');
    const phone = await screen.findByLabelText('Telefone');
    expect((phone as HTMLInputElement).value).toBe('+55 11 4000-1234');

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(host.writes()).toEqual([]);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(host.writes()).toEqual([['DELETE', `${API}/contacts/c1`, undefined]]),
    );
  });

  it('contato inexistente mostra a mensagem e volta para a listagem', async () => {
    setupHost('manager', {
      [`GET ${API}/contacts/zz`]: new NotFound('Contato não encontrado.'),
      [`GET ${API}/contacts`]: { contacts: [] },
    });
    const user = userEvent.setup();
    renderAt('/ext/emergency-contacts/zz');
    expect((await screen.findByRole('alert')).textContent).toBe('Contato não encontrado.');
    await user.click(screen.getByRole('button', { name: 'Voltar para a listagem' }));
    expect(await screen.findByText(/Nenhum contato de emergência/)).toBeTruthy();
  });
});

describe('slot profile.sections', () => {
  it('lista os contatos da equipe só para leitura', async () => {
    setupHost('member', { [`GET ${API}/contacts`]: { contacts: [NOC] } });
    render(<ProfileContacts />);
    expect(await screen.findByText('Plantão NOC')).toBeTruthy();
    expect(screen.getByText('+55 11 4000-1234')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
