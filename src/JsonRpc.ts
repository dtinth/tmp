export class JsonRpcPayloadChecker<T extends JsonRpcDefinition> {
  isMethodCall<K extends keyof T>(
    message: unknown,
    method: K
  ): message is JsonRpcMethodCall<K, T[K]['params']> {
    return isJsonRpcMethodCall(message) && message.method === method
  }

  replyResult<K extends keyof T>(
    message: JsonRpcMethodCall<K, any>,
    result: T[K]['result']
  ) {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: result,
    }
  }
}

export interface JsonRpcDefinition {
  [methodName: string]: {
    params: any
    result?: any
  }
}

export interface JsonRpcMethodCall<MethodName, MethodParams> {
  id: string
  method: MethodName
  params: MethodParams
}

function isJsonRpcMethodCall(
  message: any
): message is { method: string; params: any } {
  return message && message.method
}
