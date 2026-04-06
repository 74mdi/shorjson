const NOTE_LINK_PROTOCOLS = new Set(["http:", "https:"]);
const NOTE_ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, "&quot;");
}

export function sanitizeNoteLink(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return NOTE_LINK_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function extractHref(attributes: string): string | null {
  const match = attributes.match(
    /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/i,
  );

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

export function sanitizeNoteHtml(value: string): string {
  let html = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|meta|link|form|button|input|textarea|select|option)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|svg|math|meta|link|form|button|input|textarea|select|option)\b[^>]*\/?\s*>/gi,
      "",
    );

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tagName, attrs) => {
    const normalizedTagName = String(tagName).toLowerCase();
    const isClosingTag = full.startsWith("</");

    if (!NOTE_ALLOWED_TAGS.has(normalizedTagName)) {
      return "";
    }

    if (normalizedTagName === "br" || normalizedTagName === "hr") {
      return `<${normalizedTagName}>`;
    }

    if (isClosingTag) {
      return `</${normalizedTagName}>`;
    }

    if (normalizedTagName === "a") {
      const safeHref = sanitizeNoteLink(extractHref(String(attrs)) ?? "");
      if (!safeHref) {
        return "";
      }

      return `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noopener noreferrer">`;
    }

    return `<${normalizedTagName}>`;
  });

  return html.trim();
}

export function stripNoteHtml(value: string): string {
  return decodeHtmlEntities(
    String(value ?? "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*(div|p|h1|h2|h3|tr|li|blockquote|table|ul|ol|pre)\s*>/gi, "\n")
      .replace(/<\s*hr\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim(),
  );
}
