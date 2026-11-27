import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/**/*.test.ts', 'web/**/*.test.{ts,tsx}'],
    // O web-sdk instalado precisa passar pelo Vite: externo, ele carrega outra cópia do
    // react-router e o MemoryRouter do teste não vale para os componentes dele.
    server: { deps: { inline: ['@diovanibmotta/plantao365-web-sdk'] } },
  },
});
