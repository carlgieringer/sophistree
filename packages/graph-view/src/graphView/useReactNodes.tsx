import { MutableRefObject, UIEvent } from "react";
import cn from "classnames";
import cytoscape, { NodeDataDefinition } from "cytoscape";
import { useEffect, useMemo } from "react";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { peterRiver } from "../colors";
import "./GraphView.scss";
import { OnFocusMediaExcerpt } from "./PropositionAppearanceDialog";
import { MediaExcerpt, preferredUrl } from "@sophistree/common";
import { Logger as GraphViewLogger, PropositionNodeData } from "./graphTypes";
import { nodeOutcomeClasses } from "./useOutcomes";
import { getLayout } from "./layout";

export function useReactNodes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  setVisitAppearancesDialogProposition: (
    data: PropositionNodeData | undefined,
  ) => void,
  onFocusMediaExcerpt: OnFocusMediaExcerpt,
  logger: GraphViewLogger,
) {
  const reactNodesConfig = useMemo(
    () => [
      {
        query: `node[entity.type="Proposition"]`,
        template: function (data: NodeDataDefinition) {
          const nodeData = data as PropositionNodeData;
          const appearanceCount = nodeData.appearances?.length;
          const appearanceNoun =
            "appearance" + (appearanceCount === 1 ? "" : "s");
          function onClick<T extends UIEvent>(event: T) {
            event.preventDefault();
            event.stopPropagation();
            setVisitAppearancesDialogProposition(nodeData);
          }
          return (
            <>
              {appearanceCount ? (
                <span
                  title={`${appearanceCount} ${appearanceNoun}`}
                  className={cn("appearances-icon", {
                    selected: nodeData.isAnyAppearanceSelected,
                  })}
                  onClick={onClick}
                  onTouchEnd={onClick}
                >
                  <Icon name="crosshairs-gps" />
                  {appearanceCount}
                </span>
              ) : undefined}
              <p>{nodeData.entity.text}</p>
            </>
          );
        },
        mode: "replace" as const,
        syncClasses,
        containerCSS: {
          padding: "1em",
          borderRadius: "8px",
          fontFamily: "Roboto",
        },
      },
      {
        query: `node[entity.type="MediaExcerpt"]`,
        template: function (data: NodeDataDefinition) {
          const mediaExcerpt = data.entity as MediaExcerpt;
          const url = preferredUrl(mediaExcerpt.urlInfo);
          return (
            <>
              <p>{mediaExcerpt.quotation}</p>
              <a
                href={url}
                title={url}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFocusMediaExcerpt(mediaExcerpt);
                  return false;
                }}
              >
                {mediaExcerpt.sourceInfo.name}
              </a>
            </>
          );
        },
        mode: "replace" as const,
        syncClasses,
        containerCSS: {
          padding: "1em",
          backgroundColor: peterRiver,
          borderRadius: "8px",
          fontFamily: "Roboto",
        },
      },
    ],
    [setVisitAppearancesDialogProposition, onFocusMediaExcerpt],
  );

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.reactNodes({
        layoutOptions: getLayout(false),
        nodes: reactNodesConfig,
        logger,
      });
    }
  }, [cyRef, reactNodesConfig, logger]);
}

const syncClasses = ["hover-highlight", "dragging", ...nodeOutcomeClasses];
