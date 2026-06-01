import { useGLTF } from '@react-three/drei'
import { createContext, useContext } from 'react'

export type ExtendGltfLoader = NonNullable<Parameters<typeof useGLTF>[3]>
export type Ktx2CapableLoader = { setKTX2Loader: (loader: unknown) => void }

export const SharedGltfLoaderContext = createContext<ExtendGltfLoader | null>(null)

export function useSharedGltfLoader() {
  const extendLoader = useContext(SharedGltfLoaderContext)
  if (!extendLoader) throw new Error('useSharedGltfLoader must be used inside SharedGltfLoaderProvider')
  return extendLoader
}
