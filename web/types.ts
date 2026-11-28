import { pluginApi } from '@plantao365/web-sdk';

export const PLUGIN_ID = 'emergency-contacts';
export const apiPath = pluginApi(PLUGIN_ID);

/** Telas do plugin em /ext/emergency-contacts (rotas declaradas em index.tsx). */
export const CONTACTS_PATH = `/ext/${PLUGIN_ID}`;
export const CONTACTS_NEW_PATH = `${CONTACTS_PATH}/new`;
export const contactPath = (id: string) => `${CONTACTS_PATH}/${id}`;

export interface Contact {
  id: string;
  teamId: string;
  name: string;
  phone: string;
  role: string;
  notes: string;
  needsReview: boolean;
  reviewedAt: string;
  updatedAt: string;
}

export interface ContactValues {
  name: string;
  phone: string;
  role: string;
  notes: string;
}

export const EMPTY_CONTACT: ContactValues = { name: '', phone: '', role: '', notes: '' };

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const isPhone = (phone: string) =>
  /^\+?[0-9 ()-]{1,40}$/.test(phone) && /^(\D*\d){8,20}\D*$/.test(phone);

/** Mesmas regras da API (server/contacts.ts). */
export function validateContact(v: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (!v.name.trim()) errors.name = 'Informe o nome.';
  else if (v.name.trim().length > 100) errors.name = 'Use no máximo 100 caracteres.';
  if (!v.phone.trim()) errors.phone = 'Informe o telefone.';
  else if (!isPhone(v.phone.trim())) errors.phone = 'Use de 8 a 20 dígitos.';
  if (v.role.trim().length > 60) errors.role = 'Use no máximo 60 caracteres.';
  if (v.notes.trim().length > 500) errors.notes = 'Use no máximo 500 caracteres.';
  return errors;
}
