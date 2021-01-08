import { JsonRpcDefinition } from './JsonRpc'

export interface IntegrationsRpcInterface extends JsonRpcDefinition {
  'tmp/getOpenedFile': {
    params: {
      sessionId: string
    }
    result: {
      blob: Blob
      file: {
        _rev: string
        _id: string
        name: string
        type: string
      }
    }
  }
  'tmp/newFile': {
    params: {
      sessionId: string
      name: string
      blob: Blob
    }
    result: {}
  }
}
