import { TextEncoder, TextDecoder } from "util";

// Fixes https://github.com/jsdom/jsdom/issues/2524
Object.assign(global, { TextDecoder, TextEncoder });
