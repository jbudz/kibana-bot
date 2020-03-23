import { addDaysToTimeExcludingWeekends } from './backport_reminder'

it('adds 48 hours to sunday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-22T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-24T00:00:00.000Z`)
})

it('adds 48 hours to monday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-23T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-25T00:00:00.000Z`)
})

it('adds 48 hours to tuesday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-24T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-26T00:00:00.000Z`)
})

it('adds 48 hours to wednesday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-25T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-27T00:00:00.000Z`)
})

it('adds 72 hours to thursday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-26T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-30T00:00:00.000Z`)
})

it('adds 96 hours to friday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-27T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-31T00:00:00.000Z`)
})

it('adds 72 hours to saturday dates', () => {
  expect(
    addDaysToTimeExcludingWeekends(new Date('2020-03-28T00:00:00Z'), 2),
  ).toMatchInlineSnapshot(`2020-03-31T00:00:00.000Z`)
})
