/**
 * pi-pdf extension
 *
 * Intercepts the `context` event to replace binary-garbage PDF content
 * (produced by pi's file-processor reading PDFs as UTF-8) with real
 * extracted text via pdf-parse, before the message reaches the LLM.
 *
 * Auto-discovered by pi from ~/.pi/agent/extensions/pi-pdf/.
 */

const { readFile } = require("node:fs/promises");

let pdfParse;
try {
  pdfParse = require("pdf-parse");
} catch {
  console.warn(
    "[pi-pdf] pdf-parse not installed — run: npm install in ~/.pi/agent/extensions/pi-pdf/"
  );
}

/** Cache: absolute PDF path → extracted text. Survives media TTL cleanup. */
const cache = new Map();

async function extractText(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);
  if (!pdfParse) throw new Error("pdf-parse not available");
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  const text = data.text.trim() || "[PDF contained no extractable text]";
  cache.set(filePath, text);
  return text;
}

/** String.replace but with an async replacer function. */
async function replaceAsync(str, regex, replacer) {
  const promises = [];
  str.replace(regex, (...args) => {
    promises.push(replacer(...args));
    return "";
  });
  const resolved = await Promise.all(promises);
  let i = 0;
  return str.replace(regex, () => resolved[i++]);
}

const PDF_TAG_RE =
  () => /<file name="([^"]*\.pdf)">([\s\S]*?)<\/file>/gi;

async function processText(text) {
  const re = PDF_TAG_RE();
  if (!re.test(text)) return { text, changed: false };

  let changed = false;
  const newText = await replaceAsync(
    text,
    PDF_TAG_RE(),
    async (_, filePath) => {
      changed = true;
      try {
        const extracted = await extractText(filePath);
        return `<file name="${filePath}">\n${extracted}\n</file>`;
      } catch (e) {
        return `<file name="${filePath}">\n[pi-pdf: extraction failed — ${e.message}]\n</file>`;
      }
    }
  );
  return { text: newText, changed };
}

async function fixMessages(messages) {
  let anyChanged = false;

  const fixed = await Promise.all(
    messages.map(async (msg) => {
      if (msg.role !== "user") return msg;

      // String content
      if (typeof msg.content === "string") {
        const { text, changed } = await processText(msg.content);
        if (changed) {
          anyChanged = true;
          return { ...msg, content: text };
        }
        return msg;
      }

      // Array content (standard OpenAI-style parts)
      if (!Array.isArray(msg.content)) return msg;
      let msgChanged = false;
      const newParts = await Promise.all(
        msg.content.map(async (part) => {
          if (part.type !== "text") return part;
          const { text, changed } = await processText(part.text);
          if (changed) {
            msgChanged = true;
            return { ...part, text };
          }
          return part;
        })
      );
      if (msgChanged) {
        anyChanged = true;
        return { ...msg, content: newParts };
      }
      return msg;
    })
  );

  return { messages: fixed, changed: anyChanged };
}

module.exports = async function (pi) {
  pi.on("context", async (event) => {
    const { messages, changed } = await fixMessages(event.messages);
    return changed ? { messages } : undefined;
  });
};
