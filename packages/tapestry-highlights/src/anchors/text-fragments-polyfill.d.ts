declare module "text-fragments-polyfill/dist/fragment-generation-utils.js" {
  function generateFragment(selection: Selection): GenerateFragmentResult;

  function generateFragmentFromRange(range: Range): GenerateFragmentResult;

  interface GenerateFragmentResult {
    status: GenerateFragmentStatus;
    fragment: TextFragment;
  }

  const GenerateFragmentStatus = {
    SUCCESS: 0, // A fragment was generated.
    INVALID_SELECTION: 1, // The selection provided could not be used.
    AMBIGUOUS: 2, // No unique fragment could be identified for this selection.
    TIMEOUT: 3, // Computation could not complete in time.
    EXECUTION_FAILED: 4, // An exception was raised during generation.
  };

  interface TextFragment {
    textStart: string;
    textEnd: string;
    prefix: string;
    suffix: string;
  }

  function setTimeout(timeout: number | null): void;
}

declare module "text-fragments-polyfill/text-fragment-utils" {
  function getFragmentDirectives(hash: string): { text: string[] };
  function parseFragmentDirectives(fragmentDirectives: { text: string[] }): {
    text: TextFragment[];
  };
  function processTextFragmentDirective(textFragment: TextFragment): Range[];
}
