import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  api,
  ConfirmDialog,
  FormActions,
  FormPage,
  FormSection,
} from '@plantao365/web-sdk';
import {
  apiPath,
  CONTACTS_PATH,
  EMPTY_CONTACT,
  validateContact,
  type Contact,
  type ContactErrors,
  type ContactValues,
} from './types';

const FIELDS: { key: keyof ContactValues; label: string; type?: string; wide?: boolean }[] = [
  { key: 'name', label: 'Nome', wide: true },
  { key: 'phone', label: 'Telefone', type: 'tel' },
  { key: 'role', label: 'Função' },
];

/** Cadastro, edição e exclusão de um contato (rota própria, separada da listagem). */
export function ContactForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const navigate = useNavigate();
  const [values, setValues] = useState<ContactValues | null>(isNew ? EMPTY_CONTACT : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const controller = new AbortController();
    api
      .get<{ contact: Contact }>(apiPath(`/contacts/${id}`), controller.signal)
      .then(({ contact: c }) =>
        setValues({ name: c.name, phone: c.phone, role: c.role, notes: c.notes }),
      )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar o contato.');
      });
    return () => controller.abort();
  }, [id, isNew]);

  const back = () => void navigate(CONTACTS_PATH);
  const crumbs = [
    { label: 'Contatos de emergência', to: CONTACTS_PATH },
    { label: isNew ? 'Novo contato' : (values?.name ?? 'Editar') },
  ];

  if (loadError) {
    return (
      <FormPage crumbs={crumbs} title="Contato" onSubmit={back}>
        <p className="alert" role="alert">
          {loadError}
        </p>
        <div className="ui-actions">
          <button type="button" className="btn" onClick={back}>
            Voltar para a listagem
          </button>
        </div>
      </FormPage>
    );
  }
  if (!values) {
    return (
      <p className="status" role="status">
        Carregando…
      </p>
    );
  }

  const set = (patch: Partial<ContactValues>) => {
    setErrors({});
    setValues({ ...values, ...patch });
  };

  const save = async () => {
    const found = validateContact(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      if (isNew) await api.post(apiPath('/contacts'), values);
      else await api.put(apiPath(`/contacts/${id}`), values);
      back();
    } catch {
      // erro exibido pelo toast do host
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(apiPath(`/contacts/${id}`));
      setConfirmingDelete(false);
      back();
    } catch {
      setConfirmingDelete(false);
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: keyof ContactValues) =>
    errors[key] && (
      <span className="ui-field-error" role="alert">
        {errors[key]}
      </span>
    );

  return (
    <>
      <FormPage
        crumbs={crumbs}
        title={isNew ? 'Novo contato' : 'Editar contato'}
        description="Salvar também marca o contato como revisado."
        onSubmit={() => void save()}
      >
        <FormSection title="Contato" description="Quem acionar e em que número.">
          <div className="ui-fields">
            {FIELDS.map((f) => (
              <label key={f.key} className={`ui-field${f.wide ? ' ui-field--wide' : ''}`}>
                {f.label}
                <input
                  type={f.type ?? 'text'}
                  value={values[f.key]}
                  aria-invalid={errors[f.key] ? true : undefined}
                  onChange={(e) => set({ [f.key]: e.target.value })}
                />
                {fieldError(f.key)}
              </label>
            ))}
            <label className="ui-field ui-field--wide">
              Observações
              <textarea
                rows={3}
                value={values.notes}
                aria-invalid={errors.notes ? true : undefined}
                onChange={(e) => set({ notes: e.target.value })}
              />
              {fieldError('notes')}
            </label>
          </div>
        </FormSection>
        <FormActions
          busy={busy}
          onCancel={back}
          onDelete={isNew ? undefined : () => setConfirmingDelete(true)}
        />
      </FormPage>
      {confirmingDelete && (
        <ConfirmDialog
          title={`Excluir “${values.name}”?`}
          message="O contato sai da lista da equipe e dos próximos e-mails de boas-vindas."
          confirmLabel="Excluir"
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  );
}
