import { describe, expect, it } from "vitest";

import { csvField, isExportFormat, safeFilename } from "./format";

describe("csvField", () => {
  it("quota sempre il campo", () => {
    expect(csvField("panna")).toBe('"panna"');
  });

  it("raddoppia le virgolette interne", () => {
    expect(csvField('cioccolato "fondente"')).toBe('"cioccolato ""fondente"""');
  });

  it("neutralizza le formule del foglio di calcolo", () => {
    // Senza il prefisso, Excel eseguirebbe la cella all'apertura.
    expect(csvField("=1+1")).toBe(`"'=1+1"`);
    expect(csvField("+SUM(A1)")).toBe(`"'+SUM(A1)"`);
    expect(csvField("@import")).toBe(`"'@import"`);
  });

  it("lascia intatti i numeri negativi", () => {
    expect(csvField(-12.5)).toBe('"-12.5"');
    expect(csvField("-12,5")).toBe('"-12,5"');
  });

  it("preserva il separatore e gli a capo dentro le virgolette", () => {
    expect(csvField("latte; panna")).toBe('"latte; panna"');
    expect(csvField("riga1\nriga2")).toBe('"riga1\nriga2"');
  });
});

describe("safeFilename", () => {
  it("lascia passare uno slug normale", () => {
    expect(safeFilename("crema-vaniglia", "ricetta")).toBe("crema-vaniglia");
  });

  it("neutralizza le virgolette che chiuderebbero l'header", () => {
    expect(safeFilename('a"; x="b', "ricetta")).toBe("a-x-b");
  });

  it("neutralizza CR e LF che inietterebbero header", () => {
    expect(safeFilename("a\r\nX-Injected: 1", "ricetta")).toBe("a-X-Injected-1");
  });

  it("neutralizza il path traversal togliendo i separatori", () => {
    // I punti restano (sono legittimi in un nome file), ma senza `/` non
    // c'è più un percorso da risalire.
    expect(safeFilename("../../etc/passwd", "ricetta")).toBe("..-..-etc-passwd");
  });

  it("ripiega sul fallback quando non resta nulla", () => {
    expect(safeFilename("///", "ricetta")).toBe("ricetta");
    expect(safeFilename("", "ricetta")).toBe("ricetta");
  });

  it("limita la lunghezza", () => {
    expect(safeFilename("a".repeat(500), "ricetta")).toHaveLength(100);
  });
});

describe("isExportFormat", () => {
  it("accetta i formati supportati", () => {
    expect(isExportFormat("json")).toBe(true);
    expect(isExportFormat("csv")).toBe(true);
  });

  it("rifiuta tutto il resto", () => {
    expect(isExportFormat("pdf")).toBe(false);
    expect(isExportFormat("")).toBe(false);
    expect(isExportFormat("CSV")).toBe(false);
  });
});
