# Contatos de emergência: plugin do Plantão365

Quem acionar em incidente, por equipe. É também o **plugin de referência** do kernel do [Plantão365](https://github.com/diovanibmotta/plantao365): use como ponto de partida para o seu.

## O que ele faz

- Tela **Contatos** no menu, com listagem e formulário (gestor cria, edita e exclui; membro e convidado consultam).
- Seção "Contatos de emergência" no Perfil (slot `profile.sections`).
- E-mail com os contatos para quem entra na equipe (evento `team.member_added`).
- Job que marca para revisão os contatos sem edição no prazo configurado.
- Configuração em **Gestão › Plugins**: prazo de revisão em dias e envio do e-mail.

## Requisitos

- Plantão365 com o kernel de plugins (contrato `^1.1.0`).
- Node 22 ou mais novo.

> O kernel de plugins ainda está em desenvolvimento na branch `feat/microkernel-plugins` do Plantão365 e sai na versão 2.0.0.

## Instalar na sua instância

Cada instância só aceita pacotes assinados por uma chave que ela confia (`PLUGIN_PUBLIC_KEYS`).

```sh
npm ci
npm run build                                    # gera emergency-contacts-1.0.0.p365
npx plantao-plugin keygen --out ~/.plantao365    # uma vez; imprime a chave pública
npx plantao-plugin sign emergency-contacts-1.0.0.p365 --key ~/.plantao365/plugin-signing.pem
npx plantao-plugin install emergency-contacts-1.0.0.p365 --url https://plantao.exemplo --token "$PLANTAO365_PLUGIN_TOKEN"
```

Na API da instância, defina `PLUGIN_PUBLIC_KEYS` (chave impressa pelo `keygen`) e `PLUGIN_INSTALL_TOKEN`. Depois do install, habilite o plugin em **Gestão › Plugins** com a master key.

## Estrutura

| Caminho                  | Papel                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `plantao365.plugin.json` | Manifesto: id, versão, contrato do kernel e `settingsSchema`  |
| `server/index.ts`        | Rotas em `/api/extensions/emergency-contacts`, evento e job   |
| `server/contacts.ts`     | Regras e SQL, no schema `plugin_emergency_contacts`           |
| `web/index.tsx`          | Rotas em `/ext/emergency-contacts`, menu e slot               |
| `web/vite.config.ts`     | Remote Module Federation; mantenha o `root` **absoluto**      |
| `migrations/`            | Pares `NNNN_nome.up.sql` / `.down.sql`                        |
| `vendor/`                | SDKs empacotados até a publicação deles                       |

## SDKs

O `plugin-sdk` (contrato, lint de estilo e CLI `plantao-plugin`) e o `web-sdk` (componentes e tokens) estão em `vendor/` como `.tgz`. Quando o Plantão365 publicar os dois no GitHub Packages, troque as dependências `file:vendor/...` pela versão publicada.

Guia completo do autor: [docs/plugins.md](https://github.com/diovanibmotta/plantao365/blob/feat/microkernel-plugins/docs/plugins.md).

## Desenvolvimento

```sh
npm run typecheck
npm test
npm run build
```

## Licença

[GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`).
