// DitherForge canonical algorithm identifier conversion.
//
// Frontend (JavaScript) persists and displays kebab-case IDs (ALGORITHM_REGISTRY
// in src/dither-engine/algorithms.js). The parked Rust implementation uses
// snake_case IDs. These helpers convert between the two formats so future
// Rust/frontend communication is unambiguous, without altering any stored
// frontend identifier or persisted preset.
//
// Conversion rule:
//   kebab-case <-> snake_case  via  `-`  <->  `_`
//
// Exceptions (kebab -> snake) where the Rust id differs from a naive conversion.
// These are the only cases where the two registries genuinely diverge:
export const KEBAB_TO_SNAKE_EXCEPTIONS = {
  // Frontend "sierra" and "two-row-sierra" both map to the Rust "sierra_2"
  // descriptor (the Rust registry has no distinct "sierra" entry).
  "sierra": "sierra_2",
  "two-row-sierra": "sierra_2",
  // Frontend dropped the second 'h' ("ostromukhov"); Rust keeps the canonical spelling.
  "ostromukhov": "ostromoukhov",
};

export const SNAKE_TO_KEBAB_EXCEPTIONS = {
  // Inverse of the exceptions above, mapping back to the canonical frontend id.
  "sierra_2": "sierra",
  "ostromoukhov": "ostromukhov",
};

// Convert a frontend kebab-case algorithm id to the Rust snake_case form.
export function algorithmIdToSnake(id) {
  if (typeof id !== "string") return id;
  if (Object.prototype.hasOwnProperty.call(KEBAB_TO_SNAKE_EXCEPTIONS, id)) {
    return KEBAB_TO_SNAKE_EXCEPTIONS[id];
  }
  return id.replace(/-/g, "_");
}

// Convert a Rust snake_case algorithm id to the frontend kebab-case form.
export function algorithmIdToKebab(id) {
  if (typeof id !== "string") return id;
  if (Object.prototype.hasOwnProperty.call(SNAKE_TO_KEBAB_EXCEPTIONS, id)) {
    return SNAKE_TO_KEBAB_EXCEPTIONS[id];
  }
  return id.replace(/_/g, "-");
}

// Return true if `id` is present in the frontend ALGORITHM_REGISTRY.
// Imported lazily to avoid a circular dependency; callers pass the registry in.
export function isRegisteredAlgorithm(id, registry) {
  if (!Array.isArray(registry)) return false;
  return registry.some(entry => entry && entry.id === id);
}

// Normalize an incoming id (either format) to the canonical frontend kebab-case
// id when it corresponds to a registered algorithm, otherwise return it unchanged.
export function normalizeAlgorithmId(id, registry) {
  if (typeof id !== "string") return id;
  const asKebab = algorithmIdToKebab(id);
  if (isRegisteredAlgorithm(asKebab, registry)) return asKebab;
  const asSnake = algorithmIdToSnake(id);
  if (isRegisteredAlgorithm(asSnake, registry)) return asSnake;
  return id;
}
