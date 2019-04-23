export const maxDate = (...dates: (string | undefined)[]) => (
  dates
    .filter((d): d is string => typeof d === 'string')
    .map(d => new Date(d))
    .reduce((acc, d) => acc.valueOf() > d.valueOf() ? acc : d)
)