import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function control(page: Page, body: Record<string, string>) {
  await page.locator(".demo-toggle").waitFor({ state: "attached" });
  const status = await page.evaluate(async (body) => {
    const r = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.status;
  }, body);
  expect(status).toBe(200);
  return status;
}
async function login(page: Page, email = "nova@kurio.test") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function add(page: Page) {
  await page.goto("/nft/emerald-ape-042");
  await page.getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/i }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "NFT adicionado" }),
  ).toBeVisible();
}
async function checkout(page: Page) {
  await page.goto("/pagamento");
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Carteira conectada" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(9);
  await control(page, { action: "reset", scenario: "standard" });
  await page.reload();
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(9);
});
test("busca, filtros combinados, ordenação, paginação e histórico", async ({
  page,
}, info) => {
  await page.goto(
    "/?q=042&network=Ethereum&category=Arte%20digital&sort=price-asc",
  );
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(1);
  await expect(page.locator(".nft-name")).toHaveText("Emerald Ape #042");
  await page.reload();
  await expect(page.locator(".nft-name")).toHaveText("Emerald Ape #042");
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Paginação" })
    .getByRole("button", { name: "2", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await page.goBack();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator(".nft-grid .nft-card").first()).toContainText(
    "Emerald Ape",
  );
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir filtros" }).click();
    await page.getByRole("dialog").getByLabel("Fotografia").check();
    await page.getByRole("dialog").getByLabel("Polygon").check();
    await page.getByRole("button", { name: "Ver resultados" }).click();
  } else {
    await page.locator(".catalog-sidebar").getByLabel("Fotografia").check();
    await page.locator(".catalog-sidebar").getByLabel("Polygon").check();
  }
  await expect(page).toHaveURL(/category=/);
  await expect(page).toHaveURL(/network=/);
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(3);
});
test("detalhe direto, edição indisponível e recurso inexistente", async ({
  page,
}) => {
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "1/1", exact: true }),
  ).toBeDisabled();
  await page.goto("/nft/inexistente");
  await expect(page.getByRole("alert")).toContainText("NFT não encontrado");
  await page.goto("/rota-inexistente");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
test("cadastro, conflito, expiração, logout e isolamento entre usuários", async ({
  page,
}) => {
  await page.goto("/cadastro");
  await page.getByLabel("Nome de exibição").fill("Teste");
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("já possui");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@kurio.test");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page).toHaveURL("/perfil");
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Teste");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page);
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nova Sato");
  await control(page, { action: "expire" });
  await page.goto("/carteiras");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("alex@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/carteiras");
  await page.goto("/perfil");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Alex Lima");
});
test("favoritos otimistas com rollback e persistência", async ({ page }) => {
  await login(page);
  await page.goto("/nft/emerald-ape-042");
  await control(page, { action: "scenario", scenario: "favorite-failure" });
  await page.getByRole("button", { name: /^Favoritar(?: NFT)?$/ }).click();
  await expect(page.getByRole("alert")).toContainText("favorito");
  await page.goto("/favoritos");
  await expect(page.getByText("Você ainda não favoritou")).toBeVisible();
  await control(page, { action: "scenario", scenario: "standard" });
  await page.goto("/nft/emerald-ape-042");
  const favoriteResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/favorites/emerald-ape-042") &&
      r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: /^Favoritar(?: NFT)?$/ }).click();
  await favoriteResponse;
  await page.goto("/favoritos");
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".nft-card")).toHaveCount(1);
});
test("carrinho: quantidades, cupom, remoção e persistência após login", async ({
  page,
}) => {
  await add(page);
  await page.goto("/carrinho");
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(page.locator(".summary-total")).toContainText("2.396 ETH");
  await page.reload();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveText("2");
  await login(page);
  await page.goto("/carrinho");
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveText("2");
  await page.getByLabel("Código promocional", { exact: true }).fill("INVALID");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("inválido");
  await page.getByLabel("Código promocional", { exact: true }).fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("expirou");
  await page.getByLabel("Código promocional", { exact: true }).fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".summary-total")).toContainText("2.158 ETH");
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(page.locator(".summary-total")).toContainText("2.396 ETH");
  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("compra completa, recibo imutável e carrinho esvaziado", async ({
  page,
}) => {
  await add(page);
  await page.goto("/pagamento");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/pagamento");
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.locator(".summary-total")).toContainText("1.206 ETH");
  const url = page.url();
  await control(page, { action: "price" });
  await page.reload();
  await expect(page.locator(".summary-total")).toContainText("1.206 ETH");
  await page.goto("/carrinho");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
  await page.goto(url);
  await page.getByRole("button", { name: "Ver transação simulada" }).click();
  await expect(
    page.getByRole("dialog", { name: "Transação simulada" }),
  ).toBeVisible();
});
test("pagamento recusado preserva os itens", async ({ page }) => {
  await login(page);
  await add(page);
  await control(page, { action: "scenario", scenario: "payment-refused" });
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  await page.goto("/carrinho");
  await expect(page.locator(".cart-line")).toHaveCount(1);
});
test("timeout, refresh e reenvio recuperam o mesmo pedido", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await control(page, { action: "scenario", scenario: "order-timeout" });
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recuperar tentativa de compra" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("demorou mais");
  await page.reload();
  await page
    .getByRole("button", { name: "Recuperar pedido", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/pedidos");
  await expect(page.locator(".order-list-item")).toHaveCount(1);
});
test("Socket.IO atualiza preço, ignora eventos antigos e reconecta", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/pagamento");
  await expect(page.locator(".connection")).toHaveText("Conectado");
  await expect(page.locator(".summary-total")).toContainText("1.206 ETH");
  await control(page, { action: "price" });
  await expect(page.locator(".summary-total")).toContainText("1.306 ETH");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "preço ou disponibilidade atualizado" }),
  ).toBeVisible();
  await control(page, { action: "duplicate" });
  await control(page, { action: "old" });
  await expect(page.locator(".summary-total")).toContainText("1.306 ETH");
  await control(page, { action: "disconnect" });
  await expect(page.locator(".connection")).toHaveText("Conectado");
  await control(page, { action: "stock" });
  await expect(
    page.getByRole("button", { name: "Revisar compra" }),
  ).toBeDisabled();
  await expect(
    page.getByText("edição sem disponibilidade", { exact: false }).last(),
  ).toBeVisible();
});
test("cotação alterada exige nova revisão", async ({ page }) => {
  await login(page);
  await add(page);
  await checkout(page);
  await control(page, { action: "scenario", scenario: "price-changed" });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByText("A cotação mudou.", { exact: false }),
  ).toBeVisible();
  await expect(page).toHaveURL("/pagamento");
  await expect(page.locator(".summary-total")).toContainText("1.306 ETH");
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});
test("perfil, senha, avatar e carteira com validação da API", async ({
  page,
}) => {
  await login(page);
  await page.getByLabel("Nome de exibição").fill("Nova Atualizada");
  await page.getByLabel("Avatar", { exact: true }).setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYqQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Perfil salvo com sucesso.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Nova Atualizada",
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("errada");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("NovaSenha123!");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorreta");
  await page.goto("/carteiras");
  await page
    .getByLabel("Endereço da carteira", { exact: true })
    .fill("0xINVALID");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("inválido");
  await page
    .getByLabel("Endereço da carteira", { exact: true })
    .fill("0x1234567890123456789012345678901234567890");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(page.getByText("Carteira salva com sucesso.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Endereço da carteira", { exact: true }),
  ).toHaveValue("0x1234567890123456789012345678901234567890");
});
test("skeletons, erro de rede e recuperação", async ({ page }) => {
  await control(page, { action: "scenario", scenario: "slow" });
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("status", { name: "Carregando" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await control(page, { action: "scenario", scenario: "http-error" });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  await control(page, { action: "scenario", scenario: "standard" });
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
});
test("teclado, foco de diálogo, acessibilidade e ausência de overflow", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Cenários", exact: true }).click();
  await expect(page.getByLabel("Condição simulada")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Cenários", exact: true }),
  ).toBeFocused();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("regressão visual: início, detalhe, carrinho e pagamento", async ({
  page,
}) => {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".connection")).toHaveText("Conectado");
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true });
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true });
  await page.getByRole("button", { name: /^(COMPRAR|Comprar NFT)$/i }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "NFT adicionado" }),
  ).toBeVisible();
  await page.goto("/carrinho");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true });
  await login(page);
  await page.goto("/pagamento");
  await expect(page.locator(".wallet-options")).toBeVisible();
  await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true });
});

test("pedido pendente: interrupção, relógio controlado, refresh e isolamento do recibo", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await page.clock.setFixedTime(new Date("2026-11-03T18:00:00Z"));
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu pedido está em processamento" }),
  ).toBeVisible();
  const url = page.url();
  await control(page, { action: "disconnect" });
  await page.clock.setFixedTime(new Date("2026-11-03T18:00:05Z"));
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/pedidos");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "alex@kurio.test");
  await page.goto(url);
  await expect(page.getByRole("alert")).toContainText("não tem acesso");
});

test("recusa de conexão e expiração durante o checkout preservam o carrinho", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/pagamento");
  await control(page, { action: "scenario", scenario: "wallet-refused" });
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Conexão recusada");
  await control(page, { action: "scenario", scenario: "standard" });
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Carteira conectada" }),
  ).toBeVisible();
  await control(page, { action: "expire" });
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/pagamento");
  await expect(page.locator(".receipt-lines>div")).toHaveCount(1);
});

test("latências fora de ordem preservam a busca mais recente e tablet não transborda", async ({
  page,
}) => {
  await control(page, { action: "scenario", scenario: "out-of-order" });
  await page.goto("/?q=A");
  await page.getByRole("button", { name: "Cenários", exact: true }).waitFor();
  await page
    .locator(".tabs")
    .getByRole("button", { name: "Em alta", exact: true })
    .click();
  await page
    .locator(".tabs")
    .getByRole("button", { name: "Todos os NFTs", exact: true })
    .click();
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(9);
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("confirmações repetidas não geram pedidos duplicados", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/pedidos");
  await expect(page.locator(".order-list-item")).toHaveCount(1);
});

test("nova senha permanece após logout e login", async ({ page }) => {
  await login(page);
  await page.getByLabel("Senha atual", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("NovaSenha123!");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Perfil salvo com sucesso.")).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("nova@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("NovaSenha123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL("/perfil");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nova Sato");
});

test("controles de senha, login social e acessibilidade de login, carrinho e checkout", async ({
  page,
}) => {
  await page.goto("/login");
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("Kurio123!");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Login com Google indisponível",
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await add(page);
  await page.goto("/carrinho");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await login(page);
  await page.goto("/pagamento");
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  const collector = page.locator(".checkout-collector > summary");
  if (await collector.isVisible()) await collector.click();
  const preview = page.locator(".checkout-order-preview > summary");
  if (await preview.isVisible()) {
    await preview.click();
    await expect(page.locator(".receipt-lines > div").first()).toBeVisible();
    await preview.click();
  }
  await page
    .getByLabel("Nome de exibição", { exact: true })
    .fill("Colecionador revisado");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Revisar compra" }).click();
  await expect(page.getByRole("dialog")).toContainText("Colecionador revisado");
});
