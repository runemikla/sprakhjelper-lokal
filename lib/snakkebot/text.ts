// Text helpers shared by the server and the browser.

/** Plain spoken text: strips markdown that would otherwise be read aloud. */
export function cleanReply(text: string): string {
  return text
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+\n/g, '\n')
    .trim()
}

/**
 * Where the next complete sentence in `text` ends, looking from `from`.
 * A sentence is complete when its . ! ? or … is followed by a space or line
 * break (so «kl. 12» and numbers like 3.5 do not cut it). Returns -1 when no
 * complete sentence has arrived yet.
 */
export function sentenceEnd(text: string, from: number): number {
  const re = /[.!?…]+["»”)]?(?=\s)/g
  re.lastIndex = from
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const end = match.index + match[0].length
    // Skip very short pieces such as «kl.» or «f.eks.»; join them with the next.
    if (text.slice(from, end).trim().length >= 4) return end
  }
  return -1
}
