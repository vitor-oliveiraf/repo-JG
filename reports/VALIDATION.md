# Validação da entrega

Código-fonte auditado: `1b1f59bd90e4e70bacee7b3de5a8a568dc6fe4b2`. Medições concluídas em 03/11/2026, 20:08:56 (horário de Brasília).

## Verificações

- TypeScript, ESLint e build de produção: aprovados.
- Playwright: **40 testes aprovados**, 20 por viewport, incluindo oito baselines de regressão visual.
- Chromium/Chrome em 1440 × 1000 e 390 × 844; verificação adicional de overflow em 768 × 1024.
- Fluxos passam pelos handlers MSW; eventos passam por socket.io-client e pelo binding Socket.IO.
- Teclado, restauração de foco, erros de formulário, cenário lento e varredura axe em início, login, carrinho e checkout incluídos.

[Relatório HTML Playwright](playwright/index.html). Traces e screenshots são retidos automaticamente em caso de falha. A execução final não apresentou falhas.

## Lighthouse

Três execuções por página e perfil, no build otimizado servido pelo Vite preview. A tabela mostra a mediana de cada métrica/categoria, calculada independentemente. Imagens, fontes locais, funcionalidades e mocks padrão permaneceram ativos.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| inicio | mobile | 90 | 100 | 100 | 100 | 3350 | 0.00045 | 77 |
| inicio | desktop | 99 | 100 | 100 | 100 | 792 | 0.00111 | 0 |
| detalhe | mobile | 92 | 100 | 100 | 100 | 3176 | 0.00016 | 70 |
| detalhe | desktop | 100 | 100 | 100 | 100 | 765 | 0.00015 | 0 |

Metas: performance ≥ 90; acessibilidade e boas práticas ≥ 95; SEO ≥ 90.

Todas as medianas atendem às metas do desafio.

Os 12 relatórios HTML e 12 JSON completos estão em [lighthouse/](lighthouse/). [Resumo reproduzível](lighthouse/summary.json). Resultados variam com hardware, navegador e processos concorrentes; os testes E2E foram encerrados antes das medições finais.

## Ambiente e ferramentas

- SO: win32 10.0.26300
- CPU: Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz
- Node: v22.12.0
- React: 19.3.1
- Vite: 7.3.7
- Playwright: 1.64.1
- MSW: 2.15.0
- Lighthouse: 12.8.2
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- URL auditada: http://localhost:4173

Configurações versionadas em playwright.config.ts, scripts/lighthouse.mjs e .github/workflows/ci.yml.
