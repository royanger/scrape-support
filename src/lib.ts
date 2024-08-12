import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 14;

export const nanoid = customAlphabet(alphabet, length);
//
// function generatePublicId() {
//   return nanoid();
// }

const validHtmlTagsSet = new Set([
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "audio",
  "b",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
] as const);

const validHtmlTags = Array.from(validHtmlTagsSet);

export function isValidHtmlTag(
  tag: string,
): tag is (typeof validHtmlTags)[number] {
  // Remove abgle brackets and and "/" and empty space from the tag
  if (/<|>|\/| /g.test(tag)) tag = tag.replace(/<|>|\/| /g, "");
  if (validHtmlTagsSet.has(tag as unknown as (typeof validHtmlTags)[number])) {
    return true;
  } else {
    return false;
  }
}

/**
 * This function escapes angle brackets for valid HTML or JSX tags
 * and removes them if they are non-valid tags
 */
export function parseAngleBracketEscape(content: string) {
  const angleBracketStrings = content.match(
    // This RegEx should grab most HTML AND JSX tags
    /<\s*(\/?\s*[a-zA-Z0-9]+)\s*\/?\s*>/g,
  );

  if (!angleBracketStrings?.length) return content;
  angleBracketStrings.forEach((angleString) => {
    if (
      isValidHtmlTag(angleString) ||
      // This checks if the string is PascalCase
      /^<\s*\/?\s*[A-Z][a-z]*([A-Z][a-z]*)*\s*\/?\s*>$/.test(angleString)
    ) {
      content = content.replace(
        angleString,
        // Currently escaping `/` still causes issues with the parser and HTML entities are rendered as text
        angleString.replace(/</g, "`<").replace(/>/g, ">`"),
      );
    } else {
      content = content.replace(
        angleString,
        angleString.replace(/</g, "").replace(/>/g, ""),
      );
    }
  });

  return content;
}

// handle underlines as that's mostly a Discord thing
export function parseUnderline(content: string) {
  return content.replace(/__(.*?)__/g, "<u>$1</u>");
}

export function parseBadTemplatingString(content: string) {
  return content.replace(
    // currently Elsyia, Vue, Svelte currently not supported in Discord
    /```(go|json|js|ts|jsx|tsx|shell|bash|sh|ruby|rust|c#)?(.*?)```/gs,
    (_, lang: string, code: string) => {
      return lang
        ? "\n```" + lang.trim() + `\n${code.trim()}\n` + "```"
        : "\n```" + `\n${code.trim()}\n` + "```";
    },
  );
}

// handle multiline blocks that used a single backtick instead of triple backticks
export function fenceMultilineCode(content: string): string {
  return content.replace(/`([\s\S]+?)`/gs, (match, code) => {
    if (code.includes("\n")) {
      return "\n```" + `\n${code.trim()}\n` + "```\n";
    } else {
      return match;
    }
  });
}
