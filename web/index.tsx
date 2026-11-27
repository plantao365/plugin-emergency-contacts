import { definePluginWeb } from '@diovanibmotta/plantao365-web-sdk';
import { ContactForm } from './ContactForm';
import { ContactsList } from './ContactsList';
import { ProfileContacts } from './ProfileContacts';
import './styles.css';

export default definePluginWeb({
  routes: [
    // Convidado também consulta (guestReadPaths no manifesto libera o GET da API).
    { path: '', component: ContactsList, role: 'guest' },
    { path: 'new', component: ContactForm, role: 'manager' },
    { path: ':id', component: ContactForm, role: 'manager' },
  ],
  nav: [
    {
      label: 'Contatos',
      group: 'schedule',
      role: 'guest',
      // Telefone, em traço: o host aplica moldura e cor dos ícones nativos.
      icon: [
        'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
      ],
    },
  ],
  slots: { 'profile.sections': ProfileContacts },
});
