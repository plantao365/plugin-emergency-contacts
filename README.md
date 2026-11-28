# Contatos de emergência: plugin do Plantão365

[![ci](https://github.com/plantao365/plugin-emergency-contacts/actions/workflows/ci.yml/badge.svg)](https://github.com/plantao365/plugin-emergency-contacts/actions/workflows/ci.yml)

Quem acionar em incidente, por equipe. É também o **plugin de referência** do kernel do [Plantão365](https://github.com/plantao365/app): use como ponto de partida para o seu.

## O que ele faz

- Tela **Contatos** no menu, com listagem e formulário (gestor cria, edita e exclui; membro e convidado consultam, sem as observações).
- Seção "Contatos de emergência" no Perfil (slot `profile.sections`).
- E-mail com os contatos para quem entra na equipe (evento `team.member_added`).
- Marca para revisão os contatos sem edição no prazo configurado: na ativação do plugin e, depois, a cada 6 horas.
- Ajustes em **Configuração › Plugins** (gestor): prazo de revisão em dias e envio do e-mail.

## Requisitos

- Plantão365 com o kernel de plugins (contrato `^1.1.0`).
- Node 22 ou mais novo.

> O kernel de plugins ainda está em desenvolvimento na branch `feat/microkernel-plugins` do Plantão365 e sai na versão 2.0.0.

## Instalar na sua instância

Cada instância só aceita pacotes assinados por uma chave que ela confia (`PLUGIN_PUBLIC_KEYS`).

Baixe o `.p365` (sem assinatura) do [último release](https://github.com/plantao365/plugin-emergency-contacts/releases/latest) ou gere com `npm run build`. Troque `<versão>` abaixo pela versão do arquivo.

O mesmo arquivo também está no [GitHub Packages](https://github.com/plantao365/plugin-emergency-contacts/pkgs/npm/plugin-emergency-contacts). O registro exige um token com `read:packages` no `~/.npmrc` (`//npm.pkg.github.com/:_authToken=SEU_TOKEN`):

```sh
npm pack @plantao365/plugin-emergency-contacts --@plantao365:registry=https://npm.pkg.github.com
tar -xzf plantao365-plugin-emergency-contacts-<versão>.tgz --strip-components=1 package/emergency-contacts-<versão>.p365
```

```sh
npm ci
npm run build                                    # dispensável se baixou o .p365 do release
npx plantao-plugin keygen --out ~/.plantao365    # uma vez; imprime a chave pública
npx plantao-plugin sign emergency-contacts-<versão>.p365 --key ~/.plantao365/plugin-signing.pem
npx plantao-plugin install emergency-contacts-<versão>.p365 --url https://plantao.exemplo --token "$PLANTAO365_PLUGIN_TOKEN"
```

Na API da instância, defina `PLUGIN_PUBLIC_KEYS` (chave impressa pelo `keygen`) e `PLUGIN_INSTALL_TOKEN`. Depois do install, um gestor habilita o plugin em **Configuração › Plugins**.

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

Guia completo do autor: [Plugins: guia do autor](https://github.com/plantao365/app/wiki/Plugins-Guia-do-Autor).

## Desenvolvimento

```sh
npm run typecheck
npm test
npm run build
```

Fluxo, convenção de commits e release automático: [CONTRIBUTING](CONTRIBUTING.md). Versões publicadas: [releases](https://github.com/plantao365/plugin-emergency-contacts/releases).

## Licença

[GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`).
