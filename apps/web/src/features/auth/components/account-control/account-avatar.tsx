import { useState } from 'react';
export function AccountAvatar({
  src,
  name,
  className,
  size = 28,
}: {
  src: string | null;
  name: string;
  className?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className={className}
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={className} aria-hidden="true">
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
