import { useLocation } from '@/app/navigation';
import { CataloguePage } from '@/pages/catalogue/catalogue-page';
import { CatalogueHomePage } from '@/pages/catalogue-home/catalogue-home-page';

import { TeamBuilderPage } from '@/pages/team-builder/team-builder-page';

export function App() {
  const { view } = useLocation();
  if (view === 'builder') return <TeamBuilderPage />;
  return view === 'catalogue' ? <CatalogueHomePage /> : <CataloguePage />;
}
