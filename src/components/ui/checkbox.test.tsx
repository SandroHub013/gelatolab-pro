import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "./checkbox";

/**
 * Regressione: la casella "Blocca quantità" dell'editor era di fatto
 * incliccabile (~2px di larghezza invece di 16px).
 *
 * Causa: Base UI rende `Checkbox.Root` come `<span>`. Su un elemento
 * `display: inline` le proprietà `width`/`height` non si applicano
 * (CSS 2.1 §10.3.1), quindi l'utility Tailwind `size-4` non aveva alcun
 * effetto e la casella collassava alla larghezza del proprio contenuto.
 *
 * L'invariante da proteggere è quindi: la Root non deve mai restare un box
 * inline puro, altrimenti qualunque dimensione dichiarata viene ignorata.
 */
describe("Checkbox", () => {
  const markup = renderToStaticMarkup(<Checkbox aria-label="Blocca quantità" />);
  const rootClasses = markup.match(/class="([^"]*)"/)?.[1]?.split(/\s+/) ?? [];

  it("rende una root con role=checkbox", () => {
    expect(markup).toContain('role="checkbox"');
  });

  it("dichiara un display su cui le utility di dimensione si applicano", () => {
    // `inline` (default dello <span>) e `contents` ignorano width/height.
    const displayUtilities = rootClasses.filter((c) =>
      /^(inline-flex|flex|inline-block|block|grid|inline-grid|inline|contents)$/.test(c),
    );
    expect(displayUtilities).not.toEqual([]);
    expect(displayUtilities).not.toContain("inline");
    expect(displayUtilities).not.toContain("contents");
  });

  it("dichiara una dimensione esplicita per l'area cliccabile", () => {
    expect(rootClasses).toContain("size-4");
  });
});
