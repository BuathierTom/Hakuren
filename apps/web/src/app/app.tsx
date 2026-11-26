import { useEffect } from 'react';
import { useLocation } from '@/app/navigation';
import { CataloguePage } from '@/pages/catalogue/catalogue-page';
import { CatalogueHomePage } from '@/pages/catalogue-home/catalogue-home-page';

import { ProfilePage } from '@/pages/profile/profile-page';
import { TeamBuilderPage } from '@/pages/team-builder/team-builder-page';

export function App() {
  const { view } = useLocation();
  useEffect(() => {
    document.title = 'Haruken';
  }, []);
  if (view === 'profile') return <ProfilePage />;
  if (view === 'builder') return <TeamBuilderPage />;
  return view === 'catalogue' ? <CatalogueHomePage /> : <CataloguePage />;
}
