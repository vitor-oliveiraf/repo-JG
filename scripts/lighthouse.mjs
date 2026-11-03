import lighthouse from "lighthouse";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
const base = process.env.AUDIT_URL || "http://localhost:4173";
await mkdir("reports/lighthouse", { recursive: true });
const port = 9223;
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [`--remote-debugging-port=${port}`],
});
const categories = ["performance", "accessibility", "best-practices", "seo"];
const all = [];
try {
  for (const [page, path] of [
    ["inicio", "/"],
    ["detalhe", "/nft/emerald-ape-042"],
  ])
    for (const profile of ["mobile", "desktop"]) {
      const runs = [];
      for (let i = 1; i <= 3; i++) {
        const result = await lighthouse(base + path, {
          port,
          output: ["html", "json"],
          logLevel: "error",
          onlyCategories: categories,
          ...(profile === "desktop"
            ? {
                formFactor: "desktop",
                screenEmulation: {
                  mobile: false,
                  width: 1440,
                  height: 1000,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
                throttling: {
                  rttMs: 40,
                  throughputKbps: 10240,
                  cpuSlowdownMultiplier: 1,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                },
              }
            : {}),
        });
        if (!result) throw new Error("Lighthouse não retornou resultado");
        const stem = `reports/lighthouse/${page}-${profile}-${i}`;
        await writeFile(`${stem}.html`, result.report[0]);
        await writeFile(`${stem}.json`, result.report[1]);
        const lhr = result.lhr;
        const row = {
          page,
          profile,
          run: i,
          scores: Object.fromEntries(
            categories.map((c) => [
              c,
              Math.round(lhr.categories[c].score * 100),
            ]),
          ),
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
          lighthouseVersion: lhr.lighthouseVersion,
          userAgent: lhr.userAgent,
        };
        runs.push(row);
        console.log(JSON.stringify(row));
      }
      const median = (values) => values.sort((a, b) => a - b)[1];
      all.push({
        page,
        profile,
        scores: Object.fromEntries(
          categories.map((c) => [c, median(runs.map((r) => r.scores[c]))]),
        ),
        lcp: median(runs.map((r) => r.lcp)),
        cls: median(runs.map((r) => r.cls)),
        tbt: median(runs.map((r) => r.tbt)),
        runs,
      });
    }
} finally {
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}
await writeFile(
  "reports/lighthouse/summary.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      environment: {
        os: os.platform(),
        release: os.release(),
        cpu: os.cpus()[0].model,
        node: process.version,
        base,
        build:
          "Vite production preview; mocks padrão, assets e fontes locais; cache de navegação limpo pelo Lighthouse",
      },
      medians: all,
    },
    null,
    2,
  ),
);
process.exit(0);
