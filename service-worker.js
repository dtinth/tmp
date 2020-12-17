import PouchDB from 'pouchdb'
import { clientsClaim, skipWaiting } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

skipWaiting()
clientsClaim()

// must include following lines when using inject manifest module from workbox
// https://developers.google.com/web/tools/workbox/guides/precache-files/workbox-build#add_an_injection_point
const WB_MANIFEST = self.__WB_MANIFEST
precacheAndRoute(WB_MANIFEST)
cleanupOutdatedCaches()

const shareTargetDb = new PouchDB('sharetarget')
const filesDb = new PouchDB('files')

registerRoute(
  new RegExp('/share'),
  async ({ event, url }) => {
    /** @type {FormData} */
    const formData = await event.request.formData()
    await shareTargetDb.post({
      added: new Date().toJSON(),
      url: formData.get('url') || null,
      text: formData.get('text') || null,
      title: formData.get('title') || null,
      _attachments: Object.fromEntries(
        formData.getAll('file').map((file, index) => {
          console.log('Handle', file)
          return [
            file.name,
            {
              content_type: file.type,
              data: file,
            },
          ]
        })
      ),
    })
    return Response.redirect('/', 303)
  },
  'POST'
)

registerRoute(
  new RegExp('/download\\?'),
  async ({ event, url }) => {
    const blob = await filesDb.getAttachment(
      url.searchParams.get('docId'),
      'blob'
    )
    return new Response(blob, {
      headers: {
        'Content-Type': blob.type,
      },
    })
  },
  'GET'
)
