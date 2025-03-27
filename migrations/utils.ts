import { BN } from "@coral-xyz/anchor";

/**
 * Make object pretty for logging
 * @param obj Input object which should be prettified
 * @returns Well formatted string
 */
export function prettify(obj: any): string {
  let prettyObj: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const targetType = typeof obj[key];
      if (obj[key] instanceof BN) {
        prettyObj[key] = obj[key].toNumber();
      } else {
        prettyObj[key] = obj[key];
      }
    }
  }

  return JSON.stringify(prettyObj, null, 2);
}
