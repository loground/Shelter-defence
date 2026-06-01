import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo } from 'react'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { SharedGltfLoaderContext } from './sharedGltfLoaderContext'
import type { ExtendGltfLoader, Ktx2CapableLoader } from './sharedGltfLoaderContext'

const BASIS_TRANSCODER_PATH = '/basis/'

export function SharedGltfLoaderProvider({ children }: { children: React.ReactNode }) {
  const { gl } = useThree()
  const ktx2Loader = useMemo(() => {
    const loader = new KTX2Loader()
    loader.setTranscoderPath(BASIS_TRANSCODER_PATH)
    loader.detectSupport(gl)
    return loader
  }, [gl])
  const extendLoader = useCallback(
    ((loader: Ktx2CapableLoader) => {
      loader.setKTX2Loader(ktx2Loader)
    }) as ExtendGltfLoader,
    [ktx2Loader],
  )

  useEffect(() => {
    return () => {
      ktx2Loader.dispose()
    }
  }, [ktx2Loader])

  return (
    <SharedGltfLoaderContext.Provider value={extendLoader}>
      {children}
    </SharedGltfLoaderContext.Provider>
  )
}
