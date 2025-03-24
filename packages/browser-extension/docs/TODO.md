# TODO

Priority:

- Critique. Auth for validation of "quoted" entities?

- Plan identity some (allow per-map pseudonym.)

- With automerge-repo@2 the open of the first map is so slow.
  - If upgrading, include migration await in doc await.
- undo/redo

- UX for distant actions

- Move to map (new/existing)
- Add excerpt to different map (new/existing)

- When deleting collapsed, delete all collapsed (with confirmation)

- Kickstart social nature with AI researcher ("what would contradict this proposition? Search for it")

Ideas:

- Try moving compound atoms outside of compounds (removes 'complex')
- Entity mentions (mention proposition, MediaExcerpt, Justifications)

Bugs:

- Need 'dark contrast' highlights. Determine 'dark' page, then additionally apply classes with -dark
  to them.
- Conclusion still a conclusion after being added to PropositionCompound
- Conclusion with undefined proposition text
- Missing conclusion (Brendan Carr uses deceptive tactics to achieve a censorial agenda)
- Deleting a compound's justification should delete the compound
- When highlighting across page boundaries in PDF, sometimes selects entire page.
- Windows:
  - Remote cursor is off
  - Right click overlaps our own. (long press to work around)

QoL:

- Place new node on screen or, if off screen, 'grab' easily?
- Confirm deleting
- When deleting collapsed, delete all collapsed (with confirmation)
- When drag local PDF to PDF viewer, replaces file, but URL does not update.
- Drag text to make excerpt
- Edit proposition by double clicking on node

- Improve collapsing to allow collapsing some children
- When clicking highlight of collapsed entity, focus collapse indicator
- drag border should supercede selected border

- Translate sync to howdju graph/web
- connect justifications using equivalent propositions
- Auth using Chrome for now.

Automerge:

- Move async thunks into slice
- Remove slice for api address setting
- Posthog? Statsig?

- Profile info in list
- AI fact checking
- Search (extension badge)
- PropositionRelations (equivalent), alt-dragging popup
- Grabbing a node
- Critiques

- Critique maps? Or just critique sub-trees?
- How to handle rephrasings?

- Add 'creator' to maps
- Move map card to shared.
- Add nav menus etc.
- Many to many between maps and entities?

- Walkthrough of operations
- Indicate agreement/disagreement with a point
- Define how hide/emphasize things based on social consensus
- Hiding of things
- User relationships: following, trusting

- don't persist apiConfig; truth of source is storage.
- Respond to OAuth verification
  - Document sophistree
- Use RTK query instead of async thunk directly?
- Update OptionsPage, ApiEndpointOverrideSetting, AuthenticationCard to use react-native-paper
- Separate options and side panel redux store/reducers. options page should not be syncing docs!
  i.e. remove useBroadcastListener.
- Move user auth into separate table (multiple auth methods for single user)
- Look into SSR

- Test with more examples

- Include conclusion outcomes in map card (and include aggregate of all outcomes ("50% false"))
- Add 'sources excerpted for evidence' in map card

- Map improvements

  - Right click on edge gives option to add proposition countering
  - Right click on proposition gives option to add justification
  - Delete multiple elements
  - Drag PropositionCompound atoms to reorder them
  - "Grab" a node to have it follow view to make it easier to drag it far away
  - Add zoom in/out and fit view buttons in corner

- Extension design improvements

  - What happens if you have two windows open to the same map? Are edits propagated?
    - Only highlight tabs in the current window
  - Switching between dev and prod extensions with side panel open doens't clear highlights

- Try adding

  "plugin:@typescript-eslint/strict-type-checked",
  "plugin:@typescript-eslint/stylistic-type-checked",

- Justification appearances
- Collapsing

- Discover maps/appearances on current page
- Feed of maps/critiques/updates
  - What is a critique vs. an update?
  - User must affirmatively respond to all/most leaf nodes from map to be a 'critique'?
- Non-extension experience:

  - Page rewriter adding highlights?

- Following: limit current page/feed to just those followd

- Searching content by URL and proposition

- Sharing a map
- Critiquing a map (voting, adding new justifications, how to calculate outcomes?)
- Mobile experience
- Aggregating maps
- Surfacing aggregated info in a map when editing and critiquing.
- Coauthoring maps (group permissions)

- Non-neutral outcome navigation on content page (go to next green/red thing)
- Appearance justifications
- undo/redo

- Filter entity list for disconnected nodes?
  - (Filter by all nodes and disconnected?)
  - Propositions, MediaExcerpts
- Equivalent propositions:
  - combine appearances
  - combine justifications
- Support setting Justification polarity via drag.
  - https://github.com/cytoscape/cytoscape.js-popper for polarity targets?
