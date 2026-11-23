import { useState } from 'react';
export function AccountAvatar({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt=""
      width="28"
      height="28"
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={className} aria-hidden="true">
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
