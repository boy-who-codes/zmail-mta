/**
 * Spintax & Personalization Engine for Anti-Spam Content Diversification
 * Permutes phrases to prevent Gmail/Outlook hash-fingerprinting & spam filters.
 */

// Simple deterministic hash for a string seed (e.g. lead's email address)
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Parses spintax string like "{Hi|Hello|Hey} {{FirstName}}"
 * Randomizes each block or uses a deterministic seed if provided.
 */
export function parseSpintax(text: string, seed?: string): string {
  if (!text) return "";

  const spintaxRegex = /\{([^{}]+)\}/g;
  let hasMatches = true;
  let result = text;
  let counter = seed ? simpleHash(seed) : Math.floor(Math.random() * 100000);

  // Loop to resolve nested spintax from the innermost braces outward
  while (hasMatches) {
    const matched = result.match(spintaxRegex);
    if (!matched) {
      hasMatches = false;
      break;
    }

    result = result.replace(spintaxRegex, (_, options) => {
      const choices = options.split("|");
      if (choices.length === 0) return "";
      
      let selectedIndex: number;
      if (seed) {
        counter = (counter * 9301 + 49297) % 233280; // Linear congruential generator step
        selectedIndex = counter % choices.length;
      } else {
        selectedIndex = Math.floor(Math.random() * choices.length);
      }
      return choices[selectedIndex];
    });
  }

  return result;
}

/**
 * Calculates total possible unique permutation count
 * e.g. "{A|B|C} {1|2}" -> 3 * 2 = 6
 */
export function countSpintaxVariations(text: string): number {
  if (!text) return 1;

  const spintaxRegex = /\{([^{}]+)\}/g;
  let matches = text.match(spintaxRegex);
  if (!matches) return 1;

  let totalVariations = 1;
  for (const m of matches) {
    // Remove outer { and }
    const inner = m.slice(1, -1);
    const options = inner.split("|");
    if (options.length > 0) {
      totalVariations *= options.length;
    }
  }

  return totalVariations;
}

/**
 * Replaces {{TagName}} variables with recipient data
 */
export function replaceVariables(text: string, data: Record<string, string>): string {
  if (!text) return "";
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    // Try exact match, then case-insensitive
    if (data[key] !== undefined) return data[key];
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase() === lowerKey) return v;
    }
    return match; // Keep {{tag}} if variable missing
  });
}

/**
 * Generates sample spun text with variable substitution for previewing
 */
export function previewSpintaxMessage(
  template: string,
  sampleLead: Record<string, string> = {
    FirstName: "Alex",
    LastName: "Taylor",
    Company: "Acme Corp",
    Title: "VP of Engineering",
    Email: "alex@acme.com",
  },
  seed?: string
): string {
  const spun = parseSpintax(template, seed);
  return replaceVariables(spun, sampleLead);
}

/**
 * Preset spintax blocks for 1-click insertion into the editor
 */
export const SPINTAX_PRESETS = [
  {
    label: "Greeting",
    snippet: "{Hi|Hello|Hey|Greetings}",
    description: "Diverse informal & formal email salutations",
  },
  {
    label: "Opening Line",
    snippet: "{I noticed your work at|I came across your profile regarding|Saw your team's updates on}",
    description: "Organic outreach icebreaker variations",
  },
  {
    label: "Value Hook",
    snippet: "{thought you might find value in|wanted to quickly share how we assist|wanted to show our recent benchmark on}",
    description: "Cold outreach value proposition spinning",
  },
  {
    label: "Call to Action",
    snippet: "{Open to a quick 5-min chat this week?|Do you have 5 minutes this Thursday?|Would you be opposed to seeing a 2-minute workflow?|Worth a brief intro call?}",
    description: "Low-friction conversation starters",
  },
  {
    label: "Signoff",
    snippet: "{Best,|Warm regards,|Cheers,|Thanks,}",
    description: "Clean signoff variations",
  },
];
