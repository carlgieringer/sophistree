import merge from "lodash.merge";
import type { MergeDeep } from "type-fest";

/**
 * Merge two values without mutating either.
 *
 * lodash's merge's types do not correctly merge the types of subarrays. type-fest's
 * MergeDeep does support it, but attempting to extend lodash's merge's types to support this
 * for three sources results in `Type instantiation is excessively deep and possibly infinite.
 * ts(2589)`. So we provide this helper that only needs to merge two sources since the third
 * one is an empty object to achieve the copy.
 *
 * This is how we could try to extend lodash's types in a `lodash.d.ts` file:
 *
 * ```
 *  import { MergeDeep } from "type-fest";
 *  declare module "lodash" {
 *    interface LoDashStatic {
 *      // ...
 *      // This results in `Type instantiation is excessively deep and possibly infinite. ts(2589)`
 *      merge<TObject, TSource1, TSource2>(
 *        object: TObject,
 *        source1: TSource1,
 *        source2: TSource2
 *      ): MergeDeep<MergeDeep<TObject, TSource1>, TSource2>;
 *     // ...
 *    }
 *  }
 *  ```
 */
export function mergeCopy<
  Source1 extends Record<RecordKey, unknown> | undefined,
  Source2 extends Record<RecordKey, unknown> | undefined,
>(
  source1: Source1 | undefined,
  source2: Source2 | undefined,
): MergeDeep<
  Source1,
  Source2,
  { arrayMergeMode: "spread"; recurseIntoArrays: true }
>;
export function mergeCopy<
  Source1 extends unknown[] | undefined,
  Source2 extends unknown[] | undefined,
>(
  source1: Source1,
  source2: Source2,
): MergeDeep<
  Source1,
  Source2,
  { arrayMergeMode: "spread"; recurseIntoArrays: true }
>;
export function mergeCopy<Source1, Source2>(
  source1: Source1,
  source2: Source2,
) {
  if (Array.isArray(source1) !== Array.isArray(source2)) {
    throw Error(
      `mergeCopy requires two objects or two arrays: ${typeof source1} and ${typeof source2}`,
    );
  }
  const init = Array.isArray(source1) ? [] : {};
  return merge(init, source1, source2);
}

type RecordKey = string | number | symbol;
