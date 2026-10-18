/** Greedy word wrap; words wider than a line are broken by character. */
export function wrapLines(text: string, measure: (s: string) => number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/ +/)) {
      const attempt = line ? `${line} ${word}` : word;
      if (measure(attempt) <= maxW) {
        line = attempt;
        continue;
      }
      if (line) out.push(line);
      line = "";
      let chunk = "";
      for (const ch of word) {
        if (measure(chunk + ch) > maxW && chunk) {
          out.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
    }
    out.push(line);
  }
  return out;
}
