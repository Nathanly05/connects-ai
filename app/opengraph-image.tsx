import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Connects AI 中文 AI 助手平台";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f8fafc",
          color: "#0f172a",
          padding: "72px",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "22px"
          }}
        >
          <div
            style={{
              width: "92px",
              height: "92px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "22px",
              background: "#0f9f8f",
              color: "#ffffff",
              fontSize: "54px",
              fontWeight: 800
            }}
          >
            C
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <div style={{ fontSize: "34px", fontWeight: 700 }}>Connects AI</div>
            <div style={{ fontSize: "24px", color: "#475569" }}>中文 AI 助手平台</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}
        >
          <div style={{ fontSize: "70px", fontWeight: 800, lineHeight: 1.08 }}>
            中文 AI 聊天与智能创作平台
          </div>
          <div style={{ maxWidth: "920px", fontSize: "30px", lineHeight: 1.45, color: "#334155" }}>
            高速对话、深度思考、Credits 管理，以及 Stripe / 微信支付宝充值。
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "22px",
            color: "#0f766e"
          }}
        >
          <span>Powered by OpenAI</span>
          <span>•</span>
          <span>Private Beta</span>
          <span>•</span>
          <span>Connects AI</span>
        </div>
      </div>
    ),
    size
  );
}
