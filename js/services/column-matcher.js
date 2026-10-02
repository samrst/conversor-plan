/**
 * Column Matcher Service
 * Performs smart matching between expected model fields and sheet column headers.
 * Supports canonical names, alias dictionaries, case-insensitivity, and accent-insensitivity.
 */

export class ColumnMatcher {
  /**
   * Normalizes a string for robust matching:
   * - Lowercase
   * - Removes accents (diacritics: ã -> a, ç -> c, é -> e)
   * - Removes spaces, underscores, dashes, special symbols
   * @param {string} str 
   * @returns {string}
   */
  static normalizeString(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Attempts to find the best matching header among available headers.
   * @param {string[]} availableHeaders - List of column headers from the spreadsheet
   * @param {Object} fieldDefinition - Expected field definition { key, label, aliases }
   * @returns {string | null} Matched original header name, or null if not found
   */
  static matchColumn(availableHeaders, fieldDefinition) {
    if (!availableHeaders || availableHeaders.length === 0) return null;

    const normalizedHeaders = availableHeaders.map((h) => ({
      original: h,
      normalized: this.normalizeString(h)
    }));

    // 1. Check exact canonical key match
    const targetKeyNorm = this.normalizeString(fieldDefinition.key);
    const exactKeyMatch = normalizedHeaders.find((h) => h.normalized === targetKeyNorm);
    if (exactKeyMatch) return exactKeyMatch.original;

    // 2. Check exact label match
    const targetLabelNorm = this.normalizeString(fieldDefinition.label);
    const exactLabelMatch = normalizedHeaders.find((h) => h.normalized === targetLabelNorm);
    if (exactLabelMatch) return exactLabelMatch.original;

    // 3. Check alias list
    if (Array.isArray(fieldDefinition.aliases)) {
      for (const alias of fieldDefinition.aliases) {
        const aliasNorm = this.normalizeString(alias);
        const aliasMatch = normalizedHeaders.find((h) => h.normalized === aliasNorm);
        if (aliasMatch) return aliasMatch.original;
      }
    }

    // 4. Fuzzy fallback: contains key or alias as substring if length >= 4
    for (const h of normalizedHeaders) {
      if (h.normalized.length >= 4 && targetKeyNorm.length >= 4) {
        if (h.normalized.includes(targetKeyNorm) || targetKeyNorm.includes(h.normalized)) {
          return h.original;
        }
      }
      if (Array.isArray(fieldDefinition.aliases)) {
        for (const alias of fieldDefinition.aliases) {
          const aliasNorm = this.normalizeString(alias);
          if (aliasNorm.length >= 4 && (h.normalized.includes(aliasNorm) || aliasNorm.includes(h.normalized))) {
            return h.original;
          }
        }
      }
    }

    return null;
  }

  /**
   * Matches all fields for a given role against the provided headers.
   * Respects explicit manual user overrides without silently reverting to auto-match.
   * @param {string[]} availableHeaders 
   * @param {Array<{ key: string, label: string, required: boolean, aliases: string[] }>} fieldDefinitions 
   * @param {Record<string, string>} manualOverrides - Explicit user choices { [fieldKey]: selectedHeader }
   * @returns {Array<{ key: string, label: string, required: boolean, matchedHeader: string, isManual: boolean, isFound: boolean }>}
   */
  static matchAllFields(availableHeaders, fieldDefinitions, manualOverrides = {}) {
    return fieldDefinitions.map((field) => {
      // 1. Check if user has explicitly set a manual override for this field
      if (manualOverrides && Object.prototype.hasOwnProperty.call(manualOverrides, field.key)) {
        const manualHeader = manualOverrides[field.key];
        if (manualHeader && availableHeaders.includes(manualHeader)) {
          return {
            key: field.key,
            label: field.label,
            required: field.required !== false,
            matchedHeader: manualHeader,
            isManual: true,
            isFound: true
          };
        } else if (manualHeader === '' || manualHeader === null) {
          // User explicitly chose to unmap this field
          return {
            key: field.key,
            label: field.label,
            required: field.required !== false,
            matchedHeader: '',
            isManual: true,
            isFound: false
          };
        }
      }

      // 2. Perform automatic match if no manual override
      const autoMatched = this.matchColumn(availableHeaders, field);
      return {
        key: field.key,
        label: field.label,
        required: field.required !== false,
        matchedHeader: autoMatched || '',
        isManual: false,
        isFound: !!autoMatched
      };
    });
  }
}
