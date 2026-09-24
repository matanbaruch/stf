import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {Providers} from '@/ui/Providers'
import SignIn from '@/features/auth/mock/SignIn'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Providers>
      <SignIn />
    </Providers>
  </StrictMode>
)
