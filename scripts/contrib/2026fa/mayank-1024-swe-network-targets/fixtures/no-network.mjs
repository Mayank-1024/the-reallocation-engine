// Preloaded into every process the offline test spawns (NODE_OPTIONS=--import).
// Any network call fails loudly instead of silently reaching a real host.
globalThis.fetch = () => { throw new Error('network call attempted in an offline test'); };
