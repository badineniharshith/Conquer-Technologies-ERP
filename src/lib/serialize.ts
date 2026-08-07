import { Decimal } from "@prisma/client/runtime/library";

/**
 * Global serializer for Prisma query results to ensure clean transport to Client Components.
 * - Converts Prisma Decimal instances to JavaScript numbers.
 * - Converts BigInt values to string representation.
 * - Converts Date objects to ISO string representation.
 * - Recursively processes objects and arrays.
 */
export function serializeData<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Prisma Decimal
  if (Decimal.isDecimal(obj) || (typeof obj === "object" && obj.s !== undefined && obj.e !== undefined && obj.d !== undefined)) {
    return Number(obj.toString()) as unknown as T;
  }

  // Handle BigInt
  if (typeof obj === "bigint") {
    return obj.toString() as unknown as T;
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeData(item)) as unknown as T;
  }

  // Handle Plain Object
  if (typeof obj === "object" && obj.constructor === Object) {
    const serialized: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      serialized[key] = serializeData(obj[key]);
    }
    return serialized as T;
  }

  return obj;
}
