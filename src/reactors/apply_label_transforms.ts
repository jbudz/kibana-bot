export type LabelTransform = (labels: string[]) => string[]

export const applyLabelTransforms = (
  currentLabels: string[],
  transforms: LabelTransform[],
) => {
  const labels = transforms.reduce((acc, transform) => transform(acc), [
    ...currentLabels,
  ])

  const added = labels.filter(label => !currentLabels.includes(label))
  const removed = currentLabels.filter(label => !labels.includes(label))

  return added.length || removed.length ? { added, removed, labels } : null
}
