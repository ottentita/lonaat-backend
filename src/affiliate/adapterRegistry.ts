export const adapterRegistry: Record<string, () => Promise<any>> = {
  jvzoo: () => import('./adapters/jvzoo.adapter'),
  admitad: () => import('./adapters/admitad.adapter'),
  awin: () => import('./adapters/awin.adapter'),
  mylead: () => import('./adapters/mylead.adapter'),
  aliexpress: () => import('./adapters/aliexpress.adapter'),
}

export default adapterRegistry
