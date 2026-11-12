import { useState } from 'react';

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export default function Avatar({ artist, size = 48 }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  // Si la foto no existe o no carga, se muestran las iniciales.
  if (artist.photo && !broken) {
    return (
      <img
        className="avatar"
        style={style}
        src={/^https:\/\//.test(artist.photo) ? artist.photo : `${import.meta.env.BASE_URL}${artist.photo}`}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="avatar avatar-initials" style={{ ...style, fontSize: size * 0.34 }} aria-hidden="true">
      {initials(artist.name)}
    </span>
  );
}
