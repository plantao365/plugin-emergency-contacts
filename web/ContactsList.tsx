import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  api,
  EmptyState,
  FilterBar,
  normalizeSearch,
  Pagination,
  PluginPage,
  usePagination,
  useRole,
} from '@diovanibmotta/plantao365-web-sdk';
import { apiPath, CONTACTS_NEW_PATH, contactPath, type Contact } from './types';

/** Listagem dos contatos da equipe ativa; gestor cria e edita, os demais só consultam. */
export function ContactsList() {
  const navigate = useNavigate();
  const canEdit = useRole() === 'manager';
  const [items, setItems] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [review, setReview] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<{ contacts: Contact[] }>(apiPath('/contacts'), controller.signal)
      .then((r) => setItems(r.contacts))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os contatos.');
      });
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => {
    const term = normalizeSearch(search);
    return (items ?? []).filter(
      (c) =>
        (!term || normalizeSearch(`${c.name} ${c.role} ${c.phone}`).includes(term)) &&
        (!review || c.needsReview),
    );
  }, [items, search, review]);
  const pager = usePagination(visible, `${search}|${review}`);

  const cta = canEdit ? (
    <Link to={CONTACTS_NEW_PATH} className="btn primary">
      Novo contato
    </Link>
  ) : undefined;

  return (
    <PluginPage
      title="Contatos de emergência"
      description="Quem acionar em incidente, nesta equipe."
      action={items && items.length > 0 ? cta : undefined}
    >
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {items === null && !error && (
        <p className="status" role="status">
          Carregando…
        </p>
      )}
      {items?.length === 0 && (
        <EmptyState action={cta}>Nenhum contato de emergência cadastrado nesta equipe.</EmptyState>
      )}
      {items && items.length > 0 && (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Buscar por nome, função ou telefone"
            onClear={() => {
              setSearch('');
              setReview(false);
            }}
            clearable={Boolean(search || review)}
          >
            <label>
              <input
                type="checkbox"
                checked={review}
                onChange={(e) => setReview(e.target.checked)}
              />{' '}
              Só a revisar
            </label>
          </FilterBar>
          {visible.length === 0 ? (
            <p className="muted">Nenhum registro encontrado para os filtros aplicados.</p>
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table" aria-label="Contatos de emergência">
                <thead>
                  <tr>
                    <th scope="col">Nome</th>
                    <th scope="col">Função</th>
                    <th scope="col">Telefone</th>
                    {canEdit && (
                      <th scope="col">
                        <span className="sr-only">Ações</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((c) => (
                    <tr
                      key={c.id}
                      {...(canEdit && {
                        onClick: () => void navigate(contactPath(c.id)),
                        style: { cursor: 'pointer' },
                      })}
                    >
                      <td>
                        {c.name}
                        {c.needsReview && <span className="ec-review">Revisar</span>}
                      </td>
                      <td>{c.role || '—'}</td>
                      <td>
                        <a
                          href={`tel:${c.phone.replace(/[^+0-9]/g, '')}`}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {c.phone}
                        </a>
                      </td>
                      {canEdit && (
                        <td className="ui-col-actions">
                          <Link
                            to={contactPath(c.id)}
                            className="btn sm"
                            aria-label={`Editar ${c.name}`}
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            Editar
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            total={items.length}
            filtered={visible.length}
            page={pager.page}
            pages={pager.pages}
            pageSize={pager.pageSize}
            onPage={pager.setPage}
            onPageSize={pager.setPageSize}
          />
        </>
      )}
    </PluginPage>
  );
}
