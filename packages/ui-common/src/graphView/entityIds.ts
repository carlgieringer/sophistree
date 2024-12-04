import { SingularElementArgument } from "cytoscape";

export function getEntityId(element: SingularElementArgument): string {
  const entityId = element.data("entity.id") as string | undefined;
  if (!entityId) {
    throw new Error(`entityId not found for element ID ${element.id()}`);
  }
  return entityId;
}
