'use client'

import { LazyMotion } from 'motion/react'
import { ThemeProvider } from 'next-themes'
import type { JSX, PropsWithChildren } from 'react'

import { ProviderComposer } from '../../components/common/ProviderComposer'

const loadFeatures = () =>
  import('./framer-lazy-feature').then((res) => res.default)
const contexts: JSX.Element[] = [
  <ThemeProvider key="themeProvider" />,

  <LazyMotion features={loadFeatures} strict key="framer" />,
]
export function Providers({ children }: PropsWithChildren) {
  return (
    <>
      <ProviderComposer contexts={contexts}>{children}</ProviderComposer>
    </>
  )
}
