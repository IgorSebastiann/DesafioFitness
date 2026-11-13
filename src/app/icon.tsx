import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Ícone do app (PNG gerado pela Next): usado no manifest e nas notificações. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c0e",
          borderRadius: 112,
          color: "#c6ff3d",
          fontSize: 240,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        DF
      </div>
    ),
    { ...size },
  );
}
