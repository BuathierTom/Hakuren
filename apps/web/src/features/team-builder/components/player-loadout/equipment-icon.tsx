import { useState } from 'react';
import { Icon } from '@/components/ui/icon/icon';
export function EquipmentIcon({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt={name} width="24" height="24" onError={() => setFailed(true)} />
  ) : (
    <Icon name="shirt" size={18} />
  );
}
