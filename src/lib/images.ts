const responsiveArt = new Set([
  "home-imgNftArtwork18.webp",
  "home-imgNftArtwork05.webp",
  "home-imgNftArtwork09.webp",
]);
export function nftImageSources(src: string) {
  const filename = src.split("/").pop() || "";
  if (!responsiveArt.has(filename)) return undefined;
  return `${src.replace(".webp", "-360.webp")} 360w, ${src.replace(".webp", "-600.webp")} 600w, ${src} 900w`;
}
