export function stripMarkdownForSpeech(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Replace fenced code blocks with a natural spoken reference
  text = text.replace(/```[\s\S]*?```/g, ' I have displayed the code on your screen. ');

  // Remove inline code backticks while keeping the identifier
  text = text.replace(/`([^`]+)`/g, '$1');

  // Replace markdown links [label](url) with label
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove bare URLs
  text = text.replace(/https?:\/\/\S+/g, '');

  // Strip headings and blockquotes
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^>\s?/gm, '');

  // Strip bold, italic, strikethrough
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/___([^_]+)___/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Convert list markers into clean spoken pauses
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Remove leftover symbols that TTS reads awkwardly
  text = text.replace(/[~#^*|\\<>]/g, ' ');

  // Collapse whitespace
  text = text.replace(/\n+/g, '. ');
  text = text.replace(/\.\s*\./g, '.');
  text = text.replace(/\s{2,}/g, ' ');

  return text.trim();
}

export function splitIntoSpeechChunks(text: string, maxLen = 190): string[] {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= maxLen) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= maxLen) {
        current = sentence;
      } else {
        const words = sentence.split(/\s+/);
        let sub = '';
        for (const word of words) {
          if ((sub + ' ' + word).trim().length <= maxLen) {
            sub = (sub + ' ' + word).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = word;
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
