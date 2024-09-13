import {
  generateFragment,
  setTimeout,
} from "text-fragments-polyfill/dist/fragment-generation-utils.js";

export { GenerateFragmentStatus } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
export type { TextFragment } from "text-fragments-polyfill/dist/fragment-generation-utils.js";

// Disable timeouts
setTimeout(null);

export function generateFragmentFromSelection(selection: Selection) {
  return generateFragment(selection);
}
