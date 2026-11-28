import { describe, expect, it } from 'vitest';
import { validateContact } from '../web/types.js';
import { parseContact } from './contacts.js';

const base = { name: 'Plantão NOC', role: '', notes: '' };

describe.each([
  ['API', (phone: string) => parseContact({ ...base, phone }).errors.length === 0],
  ['formulário', (phone: string) => !validateContact({ ...base, phone }).phone],
])('telefone no %s', (_, accepts) => {
  it.each(['12345678', '+55 (11) 4000-1234', '1'.repeat(20), '+55 (11) 9 8765 - 4321 - 000'])(
    'aceita %s',
    (phone) => expect(accepts(phone)).toBe(true),
  );

  it.each([
    '--------',
    '(  ) -  -',
    '1234567',
    '(12) 34-567',
    '1'.repeat(21),
    '1234abcd5678',
    '1234+5678',
    `1234${' '.repeat(40)}5678`,
  ])('recusa %s', (phone) => expect(accepts(phone)).toBe(false));
});
