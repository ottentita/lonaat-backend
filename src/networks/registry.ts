import ExampleNetworkAdapter from './ExampleNetworkAdapter'
import Digistore24Adapter from './Digistore24Adapter'
import GenericNetworkAdapter from './GenericNetworkAdapter'

// registry of adapters by network key
export const networkAdapters = new Map<string, any>()

// register known adapters
networkAdapters.set('example_network', ExampleNetworkAdapter)
networkAdapters.set('digistore24', Digistore24Adapter)
networkAdapters.set('generic', GenericNetworkAdapter)

export function getAdapterForNetwork(name: string, baseApiUrl: string) {
  // Prefer explicit mapping; fall back to a Generic adapter for unknown networks so tests
  // that mock `GenericNetworkAdapter` continue to work.
  const Adapter = networkAdapters.get(name) || GenericNetworkAdapter
  return new Adapter(baseApiUrl)
}
