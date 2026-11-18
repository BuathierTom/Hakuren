import { useLocation } from '@/app/navigation';
import { CataloguePage } from '@/pages/catalogue/catalogue-page';
import { CatalogueHomePage } from '@/pages/catalogue-home/catalogue-home-page';

export function App() {
  const { view } = useLocation();
  return view === 'catalogue' ? <CatalogueHomePage /> : <CataloguePage />;
}
