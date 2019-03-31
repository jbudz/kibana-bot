// @ts-ignore
import * as li from 'li'

export function parseLinkHeader(linksHeader: string) {
  return li.parse(linksHeader) as { [key: string]: string }
}