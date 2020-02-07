import { AxiosError, AxiosResponse } from 'axios'

export interface AxiosErrorReq extends AxiosError {
  request: any
}

export interface AxiosErrorResp extends AxiosErrorReq {
  response: AxiosResponse
}

export const isAxiosErrorReq = (error: any): error is AxiosErrorReq =>
  error && error.isAxiosError && error.request

export const isAxiosErrorResp = (error: any): error is AxiosErrorResp =>
  error && error.isAxiosError && error.request && error.response

export const createAxiosErrorResp = (resp: AxiosResponse, message?: string) => {
  const error: Partial<AxiosErrorResp> = new Error(
    message || `Response failure created with status code ${resp.status}`,
  )

  error.config = resp.config
  error.isAxiosError = true
  error.request = resp.request
  error.response = resp

  return error as AxiosErrorResp
}
