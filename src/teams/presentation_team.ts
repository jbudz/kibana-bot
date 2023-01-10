import { LabelTransform } from '../reactors/apply_label_transforms'

const LABEL_TEAM_PREFIX = 'Team:'
const LABEL_PRESENTATION_TEAM = 'Team:Presentation'
const LABEL_CANVAS = 'Feature:Canvas'
const LABEL_DASHBOARD = 'Feature:Dashboard'
const LABEL_IMPACT_PREFIX = 'impact:'
const LABEL_IMPACT_NEEDS_ASSESSMENT = 'impact:needs-assessment'
const LABEL_LOE_PREFIX = 'loe:'
const LABEL_LOE_NEEDS_RESEARCH = 'loe:needs-research'
const LABEL_BUG = 'bug'

const hasCanvasOrDashboardLabel = (labels: string[]) =>
  labels.some((label) => label === LABEL_CANVAS || label === LABEL_DASHBOARD)

const hasTeamLabel = (labels: string[]) =>
  labels.some((label) => label.startsWith(LABEL_TEAM_PREFIX))

const isBug = (labels: string[]) => labels.some((label) => label === LABEL_BUG)

const shouldAddPresentationTeamLabelToIssue: LabelTransform = (labels) =>
  hasCanvasOrDashboardLabel(labels) &&
  !hasTeamLabel(labels) &&
  !labels.some((label) => label === LABEL_PRESENTATION_TEAM)
    ? [...labels, LABEL_PRESENTATION_TEAM]
    : labels

const shouldAddPresentationTeamLabelToPR: LabelTransform = (labels) =>
  hasCanvasOrDashboardLabel(labels) &&
  !labels.some((label) => label === LABEL_PRESENTATION_TEAM)
    ? [...labels, LABEL_PRESENTATION_TEAM]
    : labels

const shouldAddImpactLabel: LabelTransform = (labels) =>
  hasCanvasOrDashboardLabel(labels) &&
  isBug(labels) &&
  !labels.some((label) => label.startsWith(LABEL_IMPACT_PREFIX))
    ? [...labels, LABEL_IMPACT_NEEDS_ASSESSMENT]
    : labels

const needsImpactLabel: LabelTransform = (labels) =>
  hasCanvasOrDashboardLabel(labels) &&
  !labels.some((label) => label.startsWith(LABEL_IMPACT_PREFIX))
    ? [...labels, LABEL_IMPACT_PREFIX + '*']
    : labels

const shouldAddLOELabel: LabelTransform = (labels) =>
  hasCanvasOrDashboardLabel(labels) &&
  isBug(labels) &&
  !labels.some((label) => label.startsWith(LABEL_LOE_PREFIX))
    ? [...labels, LABEL_LOE_NEEDS_RESEARCH]
    : labels

const needsLOELabel: LabelTransform = (labels) =>
  hasCanvasOrDashboardLabel(labels) &&
  !labels.some((label) => label.startsWith(LABEL_LOE_PREFIX))
    ? [...labels, LABEL_LOE_PREFIX + '*']
    : labels

export const issueLabelTransforms = [
  shouldAddPresentationTeamLabelToIssue,
  shouldAddImpactLabel,
  shouldAddLOELabel,
]

export const prMissingLabelTransforms = [needsImpactLabel, needsLOELabel]

export const prAddLabelTransforms = [shouldAddPresentationTeamLabelToPR]
