import { useEffect, useState } from 'react';
import { api, FormSection } from '@diovanibmotta/plantao365-web-sdk';
import { apiPath, type Contact } from './types';

/** Slot `profile.sections`: os contatos da equipe ativa, só leitura. */
export function ProfileContacts() {
  const [items, setItems] = useState<Contact[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<{ contacts: Contact[] }>(apiPath('/contacts'), controller.signal)
      .then((r) => setItems(r.contacts))
      // Falha aqui não deve atrapalhar o perfil: a seção só não aparece.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (items === null) return null;
  return (
    <FormSection
      title="Contatos de emergência"
      description="Quem acionar em incidente nesta equipe."
    >
      {items.length === 0 ? (
        <p className="muted">Nenhum contato cadastrado.</p>
      ) : (
        <ul className="ec-list">
          {items.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong>
              {c.role && <span className="muted"> · {c.role}</span>}
              <span className="ec-phone">{c.phone}</span>
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}
