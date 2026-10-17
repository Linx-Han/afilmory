import '../styles/index.css'

import { createRoot } from 'react-dom/client'

import { I18nProvider } from '~/providers/i18n-provider'

import { TenantSuspendedStandalone } from '../modules/welcome/components/TenantSuspendedStandalone'

const root = document.querySelector('#root')

if (!root) {
  throw new Error('Root element not found for tenant suspended entry.')
}

createRoot(root).render(
  <I18nProvider>
    <TenantSuspendedStandalone />
  </I18nProvider>,
)
