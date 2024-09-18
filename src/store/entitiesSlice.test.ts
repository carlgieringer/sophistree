import { configureStore } from "@reduxjs/toolkit";
import reducer, {
  addEntity,
  completeDrag,
  deleteEntity,
  Justification,
  Proposition,
  PropositionCompound,
} from "./entitiesSlice";

describe("entitiesSlice", () => {
  describe("deleteEntity", () => {
    it("should delete a justification when its target is deleted", () => {
      // Initial state
      const initialState = {
        entities: [],
        selectedEntityId: undefined,
      };

      // Create a proposition (target)
      const proposition: Proposition = {
        id: "prop1",
        type: "Proposition",
        text: "Test proposition",
      };

      // Create a justification
      const justification: Justification = {
        id: "just1",
        type: "Justification",
        basisId: "basis1", // This could be any valid entity ID
        targetId: proposition.id,
        polarity: "Positive",
      };

      // Add entities to the state
      let state = reducer(initialState, addEntity(proposition));
      state = reducer(state, addEntity(justification));

      // Verify that both entities are in the state
      expect(state.entities).toHaveLength(2);
      expect(state.entities).toContainEqual(proposition);
      expect(state.entities).toContainEqual(justification);

      // Delete the proposition (target)
      state = reducer(state, deleteEntity(proposition.id));

      // Verify that both the proposition and the justification are deleted
      expect(state.entities).toHaveLength(0);
    });
  });
  describe("completeDrag", () => {
    it("reuses existing PropositionCompound", () => {
      const store = configureStore({ reducer: { entities: reducer } });

      // Add initial entities
      const proposition: Proposition = {
        id: "prop1",
        type: "Proposition",
        text: "Test proposition",
      };
      const target1: Proposition = {
        id: "target1",
        type: "Proposition",
        text: "Target proposition",
      };
      const target2: Proposition = {
        id: "target2",
        type: "Proposition",
        text: "Target proposition",
      };
      const existingCompound: PropositionCompound = {
        id: "compound1",
        type: "PropositionCompound",
        atomIds: ["prop1"],
      };

      store.dispatch(addEntity(proposition));
      store.dispatch(addEntity(target1));
      store.dispatch(addEntity(target2));
      store.dispatch(
        completeDrag({ sourceId: proposition.id, targetId: target1.id })
      );

      // Perform drag action
      store.dispatch(
        completeDrag({
          sourceId: proposition.id,
          targetId: target2.id,
        })
      );

      // Check the state after the action
      const state = store.getState().entities;

      // The existing compound should not be duplicated
      const compounds = state.entities.filter(
        (e) => e.type === "PropositionCompound"
      ) as PropositionCompound[];
      expect(compounds).toHaveLength(1);
      expect(compounds[0].atomIds).toEqual([proposition.id]);
    });
  });
});
