import { cleanMath } from "../utils/math";

// Gras (**x**) et italique (*x*) markdown -> éléments React
export function renderInline(text) {
  return text.split(/(\*\*.+?\*\*|\*[^*\s](?:[^*]*[^*\s])?\*)/g).map((part, i) => {
    if (/^\*\*.+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*].*\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
const bold = renderInline;
const isSeparatorRow = (row) => /^\|[\s:|-]+\|?$/.test(row);
const splitRow = (row) => row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

// Rendu minimal du markdown renvoyé par l'IA (titres, gras, listes, tableaux, séparateurs)
export default function RichText({ text }) {
  const lines = cleanMath(text || "").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (/^-{3,}$/.test(line)) {
      blocks.push(<hr className="rt-hr" key={i} />);
      i++;
    } else if (line.startsWith("|")) {
      const start = i;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++].trim());
      const cells = rows.filter((r) => !isSeparatorRow(r)).map(splitRow);
      blocks.push(
        <div className="rt-table-wrap" key={start}>
          <table className="rt-table">
            <thead><tr>{cells[0].map((c, j) => <th key={j}>{bold(c)}</th>)}</tr></thead>
            <tbody>
              {cells.slice(1).map((row, r) => (
                <tr key={r}>{row.map((c, j) => <td key={j}>{bold(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      const heading = line.match(/^#{1,4}\s+(.*)/);
      const item = line.match(/^[-*•]\s+(.*)/);
      if (heading) blocks.push(<div className="rt-heading" key={i}>{bold(heading[1])}</div>);
      else if (item) blocks.push(<div className="rt-li" key={i}>{bold(item[1])}</div>);
      else blocks.push(<div className="rt-p" key={i}>{bold(line)}</div>);
      i++;
    }
  }

  return <div className="rich-text">{blocks}</div>;
}
