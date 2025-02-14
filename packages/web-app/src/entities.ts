import { Prisma } from "@prisma/client";

import { ArgumentMap, Entity } from "@sophistree/common";

type PrismaArgumentMapWithEntities = Prisma.ArgumentMapGetPayload<{
  include: { entities: true };
}>;

export type ArgumentMapWithParsedEntities = Omit<
  PrismaArgumentMapWithEntities,
  "entities"
> & {
  entities: (Omit<PrismaArgumentMapWithEntities["entities"][number], "data"> &
    Entity)[];
};

export type ArgumentMapResource = ArgumentMapWithParsedEntities &
  Pick<ArgumentMap, "conclusions">;

export function parseArgumentMapEntities(
  map: PrismaArgumentMapWithEntities,
): ArgumentMapWithParsedEntities {
  return {
    ...map,
    entities: map.entities.map((entity) => ({
      ...entity,
      ...(entity.data as unknown as Entity),
    })),
  };
}
