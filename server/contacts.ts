import type { PluginTx } from '@plantao365/plugin-sdk';

/*
 * Regras e SQL dos contatos. As queries usam nomes sem schema: rodam em `ctx.withSchema`, que
 * põe `plugin_emergency_contacts` no search_path.
 */

export interface ContactInput {
  name: string;
  phone: string;
  role: string;
  notes: string;
}

export interface Contact extends ContactInput {
  id: string;
  teamId: string;
  needsReview: boolean;
  reviewedAt: string;
  updatedAt: string;
}

interface Row {
  id: string;
  team_id: string;
  name: string;
  phone: string;
  role: string;
  notes: string;
  needs_review: boolean;
  reviewed_at: Date;
  updated_at: Date;
}

const toContact = (r: Row): Contact => ({
  id: r.id,
  teamId: r.team_id,
  name: r.name,
  phone: r.phone,
  role: r.role,
  notes: r.notes,
  needsReview: r.needs_review,
  reviewedAt: r.reviewed_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = (id: string) => UUID.test(id);

/** Dígitos e separadores (até 40 caracteres), com 8 a 20 dígitos. */
export const isPhone = (phone: string) =>
  /^\+?[0-9 ()-]{1,40}$/.test(phone) && /^(\D*\d){8,20}\D*$/.test(phone);

/** Valida o corpo do POST/PUT; mesmas regras do formulário. */
export function parseContact(body: unknown): { value: ContactInput | null; errors: string[] } {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const text = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).trim() : '');
  const value = {
    name: text('name'),
    phone: text('phone'),
    role: text('role'),
    notes: text('notes'),
  };
  const errors: string[] = [];
  if (!value.name) errors.push('Nome: obrigatório.');
  else if (value.name.length > 100) errors.push('Nome: no máximo 100 caracteres.');
  if (!value.phone) errors.push('Telefone: obrigatório.');
  else if (!isPhone(value.phone)) errors.push('Telefone: use de 8 a 20 dígitos.');
  if (value.role.length > 60) errors.push('Função: no máximo 60 caracteres.');
  if (value.notes.length > 500) errors.push('Observações: no máximo 500 caracteres.');
  return { value: errors.length ? null : value, errors };
}

export async function listContacts(tx: PluginTx, teamId: string): Promise<Contact[]> {
  const rows = await tx<Row[]>`
    select * from contacts where team_id = ${teamId} order by lower(name), id`;
  return rows.map(toContact);
}

export async function getContact(tx: PluginTx, teamId: string, id: string) {
  const [row] = await tx<Row[]>`select * from contacts where id = ${id} and team_id = ${teamId}`;
  return row ? toContact(row) : null;
}

export async function insertContact(tx: PluginTx, teamId: string, c: ContactInput) {
  const [row] = await tx<Row[]>`
    insert into contacts (team_id, name, phone, role, notes)
    values (${teamId}, ${c.name}, ${c.phone}, ${c.role}, ${c.notes})
    returning *`;
  return toContact(row!);
}

/** Editar conta como revisão: zera o aviso de "revisar". */
export async function updateContact(tx: PluginTx, teamId: string, id: string, c: ContactInput) {
  const [row] = await tx<Row[]>`
    update contacts set name = ${c.name}, phone = ${c.phone}, role = ${c.role}, notes = ${c.notes},
      needs_review = false, reviewed_at = now(), updated_at = now()
    where id = ${id} and team_id = ${teamId}
    returning *`;
  return row ? toContact(row) : null;
}

export async function deleteContact(tx: PluginTx, teamId: string, id: string) {
  const rows = await tx`delete from contacts where id = ${id} and team_id = ${teamId} returning id`;
  return rows.length > 0;
}

/** Ativação e job: marca para revisão os contatos sem edição há mais de `days` dias. */
export async function markForReview(tx: PluginTx, days: number): Promise<number> {
  const rows = await tx`
    update contacts set needs_review = true
    where not needs_review and reviewed_at < now() - make_interval(days => ${days})
    returning id`;
  return rows.length;
}
