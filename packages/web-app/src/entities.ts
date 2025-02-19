import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";

import { ArgumentMap, Entity } from "@sophistree/common";

type PrismaArgumentMapWithEntities = Prisma.ArgumentMapGetPayload<{
  include: {
    entities: true;
    createdBy: {
      select: {
        id: true;
        name: true;
        pseudonym: true;
        pictureUrl: true;
      };
    };
  };
}>;

export type ArgumentMapWithParsedEntities = Omit<
  PrismaArgumentMapWithEntities,
  "entities"
> & {
  entities: (Omit<PrismaArgumentMapWithEntities["entities"][number], "data"> &
    Entity)[];
};

export type ArgumentMapResourceServer = ArgumentMapWithParsedEntities &
  Pick<ArgumentMap, "conclusions"> & {
    createdBy: {
      id: string;
      name: string | null;
      pseudonym: string;
      pictureUrl: string | null;
    } | null;
  };

export type ArgumentMapResourceResponse = Omit<
  ArgumentMapResourceServer,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

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
