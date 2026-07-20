import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocumentationPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Documentazione</h1>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Motore di calcolo</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground">
            <p>
              Il motore di calcolo di GelatoLab Pro è un insieme di funzioni pure
              (<code>domain/calculations</code>) che non dipendono da React o dal database.
              Può essere eseguito lato client (editor, ricalcolo in tempo reale) e lato server.
            </p>
            <h4 className="mt-3 font-semibold text-foreground">Formule base</h4>
            <pre className="mt-1 rounded-md bg-muted p-2 text-xs">
{`contributo_componente = quantità_ingrediente × percentuale_componente / 100
contributo_POD = quantità_ingrediente × podCoefficient
contributo_PAC = quantità_ingrediente × pacCoefficient`}
            </pre>
            <h4 className="mt-3 font-semibold text-foreground">POD (Potere Dolcificante)</h4>
            <p>
              Misura la dolcezza percepita rispetto al saccarosio (riferimento = 100).
              Calcolato come media pesata dei coefficienti POD dei singoli zuccheri
              (saccarosio=100, destrosio=74, fruttosio=173, glucosio=60, lattosio=27, maltosio=33,
              maltodestrina=20, polioli=60).
            </p>
            <h4 className="mt-3 font-semibold text-foreground">PAC (Potere Anticongelante)</h4>
            <p>
              Misura la capacità di abbassare il punto di congelamento, correlata alla
              morbidezza del gelato a bassa temperatura. Riferimento saccarosio=100
              (destrosio=190, fruttosio=190, glucosio=230, lattosio=100, maltosio=100,
              maltodestrina=60, polioli=200). L&apos;alcol contribuisce in modo significativo (~7× la % volume).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solver di calibrazione</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground">
            <p>
              Il solver utilizza la libreria HiGHS (WASM) per programmazione lineare.
              Caricato una sola volta come singleton lato server.
            </p>
            <h4 className="mt-3 font-semibold text-foreground">Formulazione</h4>
            <ul className="list-disc pl-5">
              <li>Variabili: grammi di ogni ingrediente</li>
              <li>Vincoli: somma = peso batch, lock immutabili, mandatory &gt; 0, min/max in grammi e %</li>
              <li>Obiettivo: minimizzare la somma pesata delle deviazioni dai target e dalla ricetta originale</li>
            </ul>
            <h4 className="mt-3 font-semibold text-foreground">Varianti</h4>
            <ul className="list-disc pl-5">
              <li><strong>Minima modifica</strong>: massimizza la similarità con la ricetta originale</li>
              <li><strong>Miglior equilibrio</strong>: minimizza le deviazioni dai target del preset</li>
              <li><strong>Costo ottimizzato</strong>: minimizza il costo, con vincoli di target</li>
            </ul>
            <h4 className="mt-3 font-semibold text-foreground">Target impossibili</h4>
            <p>
              Se i target sono irraggiungibili (es. lock che superano il peso batch, o minimi
              incompatibili), il solver restituisce una diagnosi esplicita con i vincoli
              conflittuali e suggerimenti per risolvere.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metriche</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1 text-left">Metrica</th>
                  <th className="px-2 py-1 text-left">Descrizione</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Solidi totali", "Percentuale di solidi totali sul peso del lotto."],
                  ["Zuccheri", "Percentuale di zuccheri totali (tutti i tipi)."],
                  ["Grassi", "Percentuale di grassi totali, con dettaglio latte/vegetali."],
                  ["Proteine", "Percentuale di proteine."],
                  ["MSNF", "Solidi Non Grassi del Latte. Se assente, derivato da proteine + lattosio + minerali."],
                  ["POD", "Potere Dolcificante headline (saccarosio-equivalente %)."],
                  ["PAC", "Potere Anticongelante headline (saccarosio-equivalente %)."],
                  ["POD/kg", "POD normalizzato per kg di miscela."],
                  ["PAC/kg", "PAC normalizzato per kg di miscela."],
                  ["Indice di equilibrio", "Euristica 0-100: più alto = bilanciamento più centrato."],
                  ["Temp. servizio", "Stima della temperatura di servizio ottimale (°C). Formula euristica."],
                  ["Costo", "Costo totale e per kg (€)."],
                  ["Energia", "kcal totali e per 100g (coefficienti Atwater)."],
                ].map(([name, desc]) => (
                  <tr key={name} className="border-b border-border/60">
                    <td className="px-2 py-1 font-medium">{name}</td>
                    <td className="px-2 py-1 text-muted-foreground">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snapshot e versioning</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            <p>
              Salvare una versione di ricetta congela una copia denormalizzata delle
              composizioni degli ingredienti usati (valori %, POD/PAC, costo al momento
              del salvataggio). Modifiche successive alla scheda di un ingrediente
              non alterano le versioni storiche.
            </p>
            <p className="mt-2">
              Nella ricetta di lavoro corrente, se la composizione di un ingrediente è
              cambiata rispetto all&apos;ultima versione salvata, viene mostrato un avviso
              con il diff nella pagina di confronto.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limiti noti e roadmap v2</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground">
            <h4 className="font-semibold text-foreground">P1 — Importante</h4>
            <ul className="list-disc pl-5">
              <li>Modalità solver: ingredienti principali, solo suggerimenti</li>
              <li>Ingredienti composti (ricetta-come-ingrediente)</li>
              <li>Modulo costi/resa/overrun</li>
              <li>Fasi di procedimento + modalità Produzione</li>
              <li>Import CSV, export PDF</li>
              <li>Cartelle/tag/preferiti</li>
            </ul>
            <h4 className="mt-2 font-semibold text-foreground">P2 — Se resta tempo</h4>
            <ul className="list-disc pl-5">
              <li>Modalità solver 5.3 (ingredienti funzionali suggeriti)</li>
              <li>Confronto tra due preset, radar chart</li>
              <li>Audit log (modifiche a ricette e ingredienti)</li>
              <li>QR code in scheda tecnica</li>
              <li>Dashboard statistiche</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
