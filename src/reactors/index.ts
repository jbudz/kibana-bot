export * from './pr'
export * from './push'
export * from './run_reactors'
export * from './status'
export * from './issue'
export * from './label'

export type LabelTransform = (labels: string[]) => string[]

export const performLabelTransform = (
  currentLabels: string[],
  transforms: LabelTransform[],
) => {
  const labels = transforms.reduce((acc, transform) => transform(acc), [
    ...currentLabels,
  ])

  const diff = [
    ...labels.filter(label => !currentLabels.includes(label)),
    ...currentLabels.filter(label => !labels.includes(label)),
  ]

  return diff.length ? labels : null
}
