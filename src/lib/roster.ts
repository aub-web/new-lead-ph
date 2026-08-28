// Who can claim a lead on the dashboard. Plain fixed list rather than
// something admin-editable — update here if the roster changes.
export const ROSTER = ["Aubrey", "Dan", "Verly", "Keeby", "Joaquin"] as const;
export type RosterName = (typeof ROSTER)[number];
