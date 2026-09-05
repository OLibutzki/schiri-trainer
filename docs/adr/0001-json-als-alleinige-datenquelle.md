# JSON als alleinige Datenquelle des Fragenkatalogs

Der Katalog lag als Markdown vor, aus dem für die Anwendung JSON erzeugt werden
sollte. Zwei gepflegte Darstellungen desselben Bestands hätten dauerhaft
auseinanderlaufen können, deshalb ist das Markdown nach einer einmaligen,
maschinell verifizierten Konvertierung entfallen: `app/data/fragen.json` ist
seither die einzige Quelle der Wahrheit.

## Considered Options

- **Markdown als Quelle, JSON als Erzeugnis**: verworfen, weil ein vergessener
  Konvertierungslauf unbemerkt eine veraltete Fragenfassung ausgeliefert hätte.
- **Neuextraktion aus den Quell-PDFs**: verworfen, weil im Markdown bereits
  verifizierte Arbeit steckte (Abgleich gegen beide PDFs, Korrektur von
  Original-Tippfehlern, Auflösung der PDF-Zeilenumbrüche), die dabei verloren
  gegangen wäre.

## Consequences

- Neue Fragen werden künftig direkt als JSON erfasst. Das ist beim Schreiben
  unangenehmer als Markdown, weshalb ein Validierungsskript in CI die Zusicherungen
  prüft, die zuvor die Markdown-Prüfskripte gesichert haben.
- Die Quell-PDFs unter `fragenkatalog/quellmaterial/` bleiben als Herkunftsbeleg
  und einzige Möglichkeit, den Katalog gegen das Original zu prüfen.
- Das entfernte Markdown bleibt über Commit `68bd394` wiederherstellbar.
