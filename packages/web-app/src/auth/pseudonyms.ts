import {
  uniqueNamesGenerator,
  Config,
  adjectives,
  animals,
} from "unique-names-generator";

const nameConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: " ",
  length: 2,
  style: "capital",
};

export function createPseudonym(userId: string): string {
  // Use the id as a seed for consistent name generation
  return uniqueNamesGenerator({ ...nameConfig, seed: userId });
}
