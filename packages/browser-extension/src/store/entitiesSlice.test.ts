/** @jest-environment jsdom */

import entitiesReducer, {
  createMap,
  addNewProposition,
  addMediaExcerpt,
  updateEntity,
  deleteEntity,
  completeDrag,
  selectEntities,
  showEntity,
  hideEntity,
  automateEntityVisibility,
  Proposition,
} from "./entitiesSlice";
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

describe("entitiesSlice", () => {
  beforeEach(() => {
    (uuidv4 as jest.Mock).mockReset();
  });

  describe("createMap", () => {
    it("should create a new map", () => {
      (uuidv4 as jest.Mock).mockReturnValue("new-map-id");
      const initialState = {
        maps: [],
        activeMapId: undefined,
        selectedEntityIds: [],
      };
      const action = createMap({ name: "Test Map" });
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps).toHaveLength(1);
      expect(newState.maps[0]).toEqual({
        id: "new-map-id",
        name: "Test Map",
        entities: [],
        conclusions: [],
      });
      expect(newState.activeMapId).toBe("new-map-id");
    });
  });

  describe("addNewProposition", () => {
    it("should add a new proposition to the active map", () => {
      (uuidv4 as jest.Mock).mockReturnValue("new-proposition-id");
      const initialState = {
        maps: [{ id: "map1", name: "Map 1", entities: [], conclusions: [] }],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = addNewProposition();
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities).toHaveLength(1);
      expect(newState.maps[0].entities[0]).toEqual({
        id: "new-proposition-id",
        type: "Proposition",
        text: "New Proposition 1",
        autoVisibility: "Visible",
      });
    });
  });

  describe("addMediaExcerpt", () => {
    it("should add a new media excerpt to the active map", () => {
      const initialState = {
        maps: [{ id: "map1", name: "Map 1", entities: [], conclusions: [] }],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const domAnchor = {
        text: { exact: "the-exact-text" },
        position: { start: 0, end: 10 },
      };
      const action = addMediaExcerpt({
        id: "new-media-excerpt-id",
        quotation: "Test quote",
        url: "https://example.com",
        sourceName: "Test Source",
        domAnchor,
      });
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities).toHaveLength(1);
      expect(newState.maps[0].entities[0]).toEqual({
        id: "new-media-excerpt-id",
        type: "MediaExcerpt",
        quotation: "Test quote",
        urlInfo: { url: "https://example.com" },
        sourceInfo: { name: "Test Source" },
        domAnchor,
        autoVisibility: "Visible",
      });
    });
    describe("expecting warnings", () => {
      let consoleWarnSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleWarnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});
      });

      afterEach(() => {
        consoleWarnSpy.mockRestore();
      });
      it("should not add a duplicate media excerpt", () => {
        const consoleWarnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const domAnchor = {
          text: { exact: "the-exact-text" },
          position: { start: 0, end: 10 },
        };
        const url = "https://example.com";
        const initialState = {
          maps: [
            {
              id: "map1",
              name: "Map 1",
              entities: [
                {
                  id: "existing-media-excerpt-id",
                  type: "MediaExcerpt" as const,
                  quotation: "Test quote",
                  urlInfo: { url },
                  sourceInfo: { name: "Test Source" },
                  domAnchor,
                  autoVisibility: "Visible" as const,
                },
              ],
              conclusions: [],
            },
          ],
          activeMapId: "map1",
          selectedEntityIds: [],
        };

        const action = addMediaExcerpt({
          id: "new-media-excerpt-id",
          quotation: "Test quote",
          url,
          sourceName: "Test Source",
          domAnchor,
        });

        const newState = entitiesReducer(initialState, action);

        // Check that no new entity was added
        expect(newState.maps[0].entities).toHaveLength(1);
        // Check that the existing entity was not modified
        expect(newState.maps[0].entities[0]).toEqual(
          initialState.maps[0].entities[0],
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("duplicative MediaExcerpt"),
        );
        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe("updateEntity", () => {
    it("should update an existing entity", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Old text",
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = updateEntity({
        id: "prop1",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        updates: { text: "New text" } as any,
      });
      const newState = entitiesReducer(initialState, action);

      expect(
        (newState.maps[0].entities[0] as unknown as Proposition).text,
      ).toBe("New text");
    });
  });

  describe("deleteEntity", () => {
    it("should delete an entity", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
              },
              {
                id: "prop2",
                type: "Proposition" as const,
                text: "Proposition 2",
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = deleteEntity("prop1");
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities).toHaveLength(1);
      expect(newState.maps[0].entities[0].id).toBe("prop2");
    });

    it("should delete a justification when its target is deleted", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
              },
              {
                id: "prop2",
                type: "Proposition" as const,
                text: "Proposition 2",
                autoVisibility: "Visible" as const,
              },
              {
                id: "just1",
                type: "Justification" as const,
                targetId: "prop1",
                basisId: "prop2",
                polarity: "Positive" as const,
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = deleteEntity("prop1");
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities).toHaveLength(1);
      expect(newState.maps[0].entities[0].id).toBe("prop2");
    });
  });

  describe("completeDrag", () => {
    it("should create a new justification", () => {
      (uuidv4 as jest.Mock).mockReturnValue("new-justification-id");
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
              },
              {
                id: "prop2",
                type: "Proposition" as const,
                text: "Proposition 2",
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = completeDrag({
        sourceId: "prop1",
        targetId: "prop2",
        polarity: "Positive",
      });
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities).toHaveLength(4);
      expect(newState.maps[0].entities[3]).toEqual({
        id: "new-justification-id",
        type: "Justification",
        targetId: "prop2",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        basisId: expect.any(String),
        polarity: "Positive",
        autoVisibility: "Visible",
      });
    });

    it("reuses existing PropositionCompound", () => {
      (uuidv4 as jest.Mock).mockReturnValue("new-justification-id");
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
              },
              {
                id: "prop2",
                type: "Proposition" as const,
                text: "Proposition 2",
                autoVisibility: "Visible" as const,
              },
              {
                id: "compound1",
                type: "PropositionCompound" as const,
                atomIds: ["prop1"],
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = completeDrag({
        sourceId: "prop1",
        targetId: "prop2",
        polarity: "Positive",
      });
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities).toHaveLength(4);
      expect(newState.maps[0].entities[3]).toEqual({
        id: "new-justification-id",
        type: "Justification",
        targetId: "prop2",
        basisId: "compound1",
        polarity: "Positive",
        autoVisibility: "Visible",
      });
    });
  });

  describe("selectEntities", () => {
    it("should select entities", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
              },
              {
                id: "prop2",
                type: "Proposition" as const,
                text: "Proposition 2",
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = selectEntities(["prop1"]);
      const newState = entitiesReducer(initialState, action);

      expect(newState.selectedEntityIds).toEqual(["prop1"]);
    });
  });

  describe("showEntity", () => {
    it("should set entity visibility to Visible", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Hidden" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = showEntity("prop1");
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities[0].explicitVisibility).toBe("Visible");
    });
  });

  describe("hideEntity", () => {
    it("should set entity visibility to Hidden", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = hideEntity("prop1");
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities[0].explicitVisibility).toBe("Hidden");
    });
  });

  describe("automateEntityVisibility", () => {
    it("should remove explicit visibility", () => {
      const initialState = {
        maps: [
          {
            id: "map1",
            name: "Map 1",
            entities: [
              {
                id: "prop1",
                type: "Proposition" as const,
                text: "Proposition 1",
                autoVisibility: "Visible" as const,
                explicitVisibility: "Hidden" as const,
              },
            ],
            conclusions: [],
          },
        ],
        activeMapId: "map1",
        selectedEntityIds: [],
      };
      const action = automateEntityVisibility("prop1");
      const newState = entitiesReducer(initialState, action);

      expect(newState.maps[0].entities[0].explicitVisibility).toBeUndefined();
    });
  });
});
