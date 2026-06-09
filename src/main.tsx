import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { TreePage } from './pages/TreePage.tsx'
import { LinkFinderPage } from './pages/LinkFinderPage.tsx'
import { DirectoryPage } from './pages/DirectoryPage.tsx'
import { ProfilePage } from './pages/ProfilePage.tsx'
import { AddRelativePage } from './pages/AddRelativePage.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { SignupPage } from './pages/SignupPage.tsx'
import { FeedPage } from './pages/FeedPage.tsx'
import { EventsPage } from './pages/EventsPage.tsx'
import { MessagesPage } from './pages/MessagesPage.tsx'
import { DemandesPage } from './pages/DemandesPage.tsx'
import { OnboardingPage } from './pages/OnboardingPage.tsx'
import { EditProfilePage } from './pages/EditProfilePage.tsx'
import { DiasporaPage } from './pages/DiasporaPage.tsx'

const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'fil', element: <FeedPage /> },
      { path: 'arbre', element: <TreePage /> },
      { path: 'lien', element: <LinkFinderPage /> },
      { path: 'membres', element: <DirectoryPage /> },
      { path: 'membre/:id', element: <ProfilePage /> },
      { path: 'diaspora', element: <DiasporaPage /> },
      { path: 'evenements', element: <EventsPage /> },
      { path: 'demandes', element: <DemandesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'messages/:id', element: <MessagesPage /> },
      { path: 'ajouter', element: <AddRelativePage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'profil/editer', element: <EditProfilePage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
