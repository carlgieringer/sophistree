import reducer, {
  addEntity,
  completeDrag,
  deleteEntity,
  createMap,
  Justification,
  Proposition,
  PropositionCompound,
  defaultVisibilityProps,
} from "./entitiesSlice";

describe("entitiesSlice", () => {
  describe("deleteEntity", () => {
    it("should delete a justification when its target is deleted", () => {
      // Initial state
      const initialState = {
        activeMapId: "map1",
        maps: [
          {
            id: "map1",
            name: "Test Map",
            entities: [],
          },
        ],
        selectedEntityId: undefined,
      };

      // Create a proposition (target)
      const proposition: Proposition = {
        id: "prop1",
        type: "Proposition",
        text: "Test proposition",
        ...defaultVisibilityProps,
      };

      // Create a justification
      const justification: Justification = {
        id: "just1",
        type: "Justification",
        basisId: "basis1", // This could be any valid entity ID
        targetId: proposition.id,
        polarity: "Positive",
        ...defaultVisibilityProps,
      };

      // Add entities to the state
      let state = reducer(initialState, addEntity(proposition));
      state = reducer(state, addEntity(justification));

      // Verify that both entities are in the state
      expect(state.maps[0].entities).toHaveLength(2);
      expect(state.maps[0].entities).toContainEqual(proposition);
      expect(state.maps[0].entities).toContainEqual(justification);

      // Delete the proposition (target)
      state = reducer(state, deleteEntity(proposition.id));

      // Verify that both the proposition and the justification are deleted
      expect(state.maps[0].entities).toHaveLength(0);
    });
  });

  describe("completeDrag", () => {
    it("reuses existing PropositionCompound", () => {
      // Initial state
      const initialState = reducer(undefined, createMap({ name: "Test Map" }));

      // Add initial entities
      const proposition: Proposition = {
        id: "prop1",
        type: "Proposition",
        text: "Test proposition",
        ...defaultVisibilityProps,
      };
      const target1: Proposition = {
        id: "target1",
        type: "Proposition",
        text: "Target proposition 1",
        ...defaultVisibilityProps,
      };
      const target2: Proposition = {
        id: "target2",
        type: "Proposition",
        text: "Target proposition 2",
        ...defaultVisibilityProps,
      };

      let state = reducer(initialState, addEntity(proposition));
      state = reducer(state, addEntity(target1));
      state = reducer(state, addEntity(target2));
      // Perform first drag action
      state = reducer(
        state,
        completeDrag({ sourceId: proposition.id, targetId: target1.id })
      );

      // Perform second drag action
      state = reducer(
        state,
        completeDrag({ sourceId: proposition.id, targetId: target2.id })
      );
      // Check the state after the actions
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      // The existing compound should not be duplicated
      const compounds = activeMap!.entities.filter(
        (e) => e.type === "PropositionCompound"
      ) as PropositionCompound[];
      expect(compounds).toHaveLength(1);
      expect(compounds[0].atomIds).toEqual([proposition.id]);

      // There should be two justifications
      const justifications = activeMap!.entities.filter(
        (e) => e.type === "Justification"
      ) as Justification[];
      expect(justifications).toHaveLength(2);
    });
  });
});
