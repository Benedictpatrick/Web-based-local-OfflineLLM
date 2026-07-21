import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#212121",
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 800,
            color: "#77F62B",
            letterSpacing: "-0.03em",
          }}
        >
          Navo AI
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a3a3a3",
            marginTop: 28,
            maxWidth: 820,
            textAlign: "center",
          }}
        >
          A private, offline AI assistant that runs entirely on your device
        </div>
      </div>
    ),
    size
  );
}
