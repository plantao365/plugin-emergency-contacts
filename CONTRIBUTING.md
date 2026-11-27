# Contribuindo

## Fluxo

1. Todo o trabalho entra na branch `main` por pull request.
2. Antes de abrir PR ou fazer push, rode:
   ```bash
   npm run typecheck && npm test && npm run build
   ```
3. Mantenha mudanças pequenas e com testes (`*.test.ts(x)` ao lado do código).
4. Mudanças de banco: novo par `NNNN_nome.up.sql` / `.down.sql` em `migrations/`; nunca edite uma migração já publicada. As tabelas ficam no schema `plugin_emergency_contacts`.
5. Faça o merge do PR com **merge commit**, sem squash: o semantic-release lê o tipo de cada commit.

## Convenções

- Código (identificadores, arquivos, rotas, chaves JSON) em inglês; texto para o usuário, comentários, nomes de teste, commits e docs em pt-BR.
- Mantenha o `root` absoluto em `web/vite.config.ts`.
- Este é o plugin de referência: prefira o caminho que um autor de plugin deveria copiar. O contrato com o kernel está no [guia do autor](https://github.com/plantao365/app/wiki/Plugins-Guia-do-Autor).

## Commits

Cada commit segue **Gitmoji + Conventional Commits**:

```
<gitmoji> tipo(escopo): descrição curta no imperativo
```

- O gitmoji vem **primeiro** na linha de assunto e define a versão publicada.
- Assunto com no máximo 100 caracteres.
- `tipo`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`.
- `escopo`: `server`, `web`, `db`, `ci`, etc.

Exemplos:

```
✨ feat(server): avisa o gestor sobre contatos a revisar
🐛 fix(web): corrige busca de contatos com acento
📝 docs: atualiza instruções de instalação
```

## Versionamento e release

| Gitmoji                                   | Versão      |
| ----------------------------------------- | ----------- |
| 💥 `:boom:` (breaking change)             | major       |
| ✨ `:sparkles:` (funcionalidade)          | minor       |
| 🐛 `:bug:`, 🚑️ `:ambulance:`, 🔒️ `:lock:` | patch       |
| demais (📝 ♻️ ✅ 🔧 …)                    | sem release |

A cada push em `main`, o workflow [ci](.github/workflows/ci.yml) valida (tipos, testes, build) e roda o semantic-release, que:

1. grava a nova versão em `package.json` e `plantao365.plugin.json`;
2. atualiza o `CHANGELOG.md` e gera o `.p365`;
3. cria a tag `vX.Y.Z` e publica o GitHub Release com o pacote anexado (**sem assinatura**: cada instância assina com a própria chave).

Não edite a versão, o `CHANGELOG.md` nem os commits `🔖 chore(release)` à mão. Mudou a faixa de `kernelApi` no manifesto de forma incompatível? Use 💥.

Nunca commite `.env`, chaves (`.pem`) ou pacotes gerados.
