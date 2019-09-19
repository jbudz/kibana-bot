import { AxiosError, AxiosResponse } from 'axios'

interface AxiosErrorReq extends AxiosError {
  request: any
}

interface AxiosErrorResp extends AxiosErrorReq {
  response: AxiosResponse
}

export const isAxiosErrorReq = (error: any): error is AxiosErrorReq =>
  error && error.request

export const isAxiosErrorResp = (error: any): error is AxiosErrorResp =>
  error && error.request && error.response
