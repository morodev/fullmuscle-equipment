const width = 1478;
const height = 1064;
const base = '/images/animations/gf';

export const GF_MEDIA = {
  width,
  height,
  poster: `${base}/poster.webp`,
  posterMobile: `${base}/poster-mobile.webp`,
  parts: (['frame', 'arm-left', 'seat', 'platform', 'arm-right'] as const).map((id) => ({
    id,
    src: `${base}/${id}.webp`,
    srcMobile: `${base}/${id}-mobile.webp`,
    x: 0,
    y: 0,
    width,
    height,
  })),
};
