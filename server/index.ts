import { definePlugin, type PluginEnv } from '@plantao365/plugin-sdk';
import type { Context } from 'hono';
import {
  deleteContact,
  getContact,
  insertContact,
  isId,
  listContacts,
  markForReview,
  parseContact,
  updateContact,
} from './contacts.js';

interface TeamMemberPayload {
  teamId: string;
  userId: string;
}

const REVIEW_JOB_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Contatos de emergência por equipe: CRUD em /api/extensions/emergency-contacts/contacts,
 * e-mail com os contatos a quem entra na equipe e marcação de contatos a revisar (na ativação
 * e por job).
 */
export default definePlugin({
  async setup(ctx) {
    const reviewDays = Number(ctx.settings.reviewDays ?? 180);
    const welcomeEmail = ctx.settings.welcomeEmail !== false;
    const { router, auth } = ctx;

    /** Equipe ativa (header do app); sem ela não há o que listar. */
    const teamOf = (c: Context<PluginEnv>) => c.get('teamId');
    const noTeam = (c: Context<PluginEnv>) =>
      c.json({ error: 'team_required', message: 'Selecione uma equipe.' }, 400);
    const notFound = (c: Context<PluginEnv>) =>
      c.json({ error: 'not_found', message: 'Contato não encontrado.' }, 404);
    const invalid = (c: Context<PluginEnv>, errors: string[]) =>
      c.json({ error: 'validation_error', message: errors.join(' '), details: errors }, 422);

    router.get('/contacts', auth.requireAuth(), async (c) => {
      const teamId = teamOf(c);
      if (!teamId) return noTeam(c);
      const contacts = await ctx.withSchema((tx) => listContacts(tx, teamId));
      // Observações são só do gestor: membro e convidado não recebem o campo.
      if (c.get('user')!.role === 'manager') return c.json({ contacts });
      return c.json({ contacts: contacts.map(({ notes: _, ...contact }) => contact) });
    });

    router.get('/contacts/:id', auth.requireRole('manager'), async (c) => {
      const teamId = teamOf(c);
      const id = c.req.param('id');
      if (!teamId) return noTeam(c);
      if (!isId(id)) return notFound(c);
      const contact = await ctx.withSchema((tx) => getContact(tx, teamId, id));
      return contact ? c.json({ contact }) : notFound(c);
    });

    router.post('/contacts', auth.requireRole('manager'), async (c) => {
      const teamId = teamOf(c);
      if (!teamId) return noTeam(c);
      const { value, errors } = parseContact(await c.req.json().catch(() => null));
      if (!value) return invalid(c, errors);
      const contact = await ctx.withSchema(async (tx) => {
        const created = await insertContact(tx, teamId, value);
        await ctx.audit(tx, {
          actorId: c.get('user')!.id,
          action: 'contact.create',
          entityType: 'emergency_contact',
          entityId: created.id,
          after: value,
        });
        return created;
      });
      return c.json({ contact, message: 'Contato criado.' }, 201);
    });

    router.put('/contacts/:id', auth.requireRole('manager'), async (c) => {
      const teamId = teamOf(c);
      const id = c.req.param('id');
      if (!teamId) return noTeam(c);
      if (!isId(id)) return notFound(c);
      const { value, errors } = parseContact(await c.req.json().catch(() => null));
      if (!value) return invalid(c, errors);
      const contact = await ctx.withSchema(async (tx) => {
        const before = await getContact(tx, teamId, id);
        if (!before) return null;
        const updated = await updateContact(tx, teamId, id, value);
        await ctx.audit(tx, {
          actorId: c.get('user')!.id,
          action: 'contact.update',
          entityType: 'emergency_contact',
          entityId: id,
          before: {
            name: before.name,
            phone: before.phone,
            role: before.role,
            notes: before.notes,
          },
          after: value,
        });
        return updated;
      });
      return contact ? c.json({ contact, message: 'Contato salvo.' }) : notFound(c);
    });

    router.delete('/contacts/:id', auth.requireRole('manager'), async (c) => {
      const teamId = teamOf(c);
      const id = c.req.param('id');
      if (!teamId) return noTeam(c);
      if (!isId(id)) return notFound(c);
      const removed = await ctx.withSchema(async (tx) => {
        const before = await getContact(tx, teamId, id);
        if (!before || !(await deleteContact(tx, teamId, id))) return false;
        await ctx.audit(tx, {
          actorId: c.get('user')!.id,
          action: 'contact.delete',
          entityType: 'emergency_contact',
          entityId: id,
          before: { name: before.name, phone: before.phone },
        });
        return true;
      });
      return removed ? c.json({ message: 'Contato excluído.' }) : notFound(c);
    });

    // Quem entra na equipe recebe os contatos por e-mail (layout base do core).
    ctx.events.subscribe<TeamMemberPayload>('team.member_added', async (tx, event) => {
      if (!welcomeEmail) return;
      const { teamId, userId } = event.payload;
      const schema = tx(ctx.schema);
      const contacts = await tx<{ name: string; phone: string; role: string }[]>`
        select name, phone, role from ${schema}.contacts
        where team_id = ${teamId} order by lower(name)`;
      if (contacts.length === 0) return;
      const [person] = await tx<{ email: string; name: string }[]>`
        select email, name from users where id = ${userId}`;
      const [team] = await tx<{ name: string }[]>`select name from teams where id = ${teamId}`;
      if (!person || !team) return;
      await ctx.enqueueEmail(tx, {
        to: person.email,
        subject: `Contatos de emergência da equipe ${team.name}`,
        heading: 'Contatos de emergência',
        paragraphs: [
          `Olá, ${person.name}. Você entrou na equipe ${team.name}.`,
          'Em incidente, estes são os contatos a acionar:',
        ],
        lines: contacts.map((c) => `${c.name}${c.role ? ` (${c.role})` : ''}: ${c.phone}`),
        dedupeKey: `welcome:${teamId}:${userId}`,
      });
    });

    const review = async () => {
      const marked = await ctx.withSchema((tx) => markForReview(tx, reviewDays));
      if (marked > 0) ctx.logger.info({ marked }, 'Contatos marcados para revisão');
    };
    ctx.jobs.register({ name: 'review', intervalMs: REVIEW_JOB_INTERVAL_MS, run: review });
    // O kernel só roda o job depois do primeiro intervalo, e cada reinício recomeça a contagem.
    await review();
  },
});
