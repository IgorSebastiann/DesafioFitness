import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone para a tela de início do iPhone. */
export default function AppleIcon() {
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
          color: "#c6ff3d",
          fontSize: 84,
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
