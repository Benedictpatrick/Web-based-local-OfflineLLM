"use client";

/** Navo's mascot: a static rendered character image (public/mascot.png,
 *  cropped from the brand render -- dark blob head, green leaf antenna,
 *  glowing eyes/smile, "N" ear badges). Life is added purely with CSS
 *  (breathing scale + gentle sway); `active` (e.g. while a reply streams)
 *  speeds both up to read as "working" rather than idle. */
export default function Mascot({
  size = 48,
  active = true,
  className,
}: {
  size?: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mascot ${active ? "mascot-active" : ""} ${className ?? ""}`}
      style={{ width: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot.png" alt="" className="mascot-img" width={400} height={444} />
    </div>
  );
}
