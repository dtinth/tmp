# tmp.spacet.me extensions API

Extensions add extra integrations to tmp.spacet.me. They are identified via a **URL**.

## Manifest file

The extensions is expected to publish a manifest file located at `tmp-manifest.json`, relative to extension URL. For example:

<table>
<col width="20%">
<col width="80%">
<tr>
<th scope="row">Extension URL</th>
<td><code>https://tmp-webrtc.spacet.me/</code></td>
</tr>
<tr>
<th scope="row">Manifest URL</th>
<td><code>https://tmp-webrtc.spacet.me/tmp-manifest.json</code></td>
</tr></table>

The structure of manifest file is specified in [ExtensionManifest.ts](https://github.com/dtinth/tmp/blob/main/src/ExtensionManifest.ts).

## Integrations API

Integrations are popup windows that appear when clicking on a file menu or the _New item_ menu.
It communicates with tmp.spacet.me via the `postMessage` API.

### Launching and Session IDs

When user selects an integration, tmp.spacet.me will open a new browser window pointing to the URL, with `#tmpsessionid=<uuid>` appended. This session ID is needed to communicate with tmp.spacet.me.

### Communicating with tmp.spacet.me

Use `window.opener.postMessage(object, '*')`. The object should follow the [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification). Available methods are listed in [IntegrationsRpcInterface.ts](https://github.com/dtinth/tmp/blob/main/src/IntegrationsRpcInterface.ts).
