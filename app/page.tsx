"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleEnter = () => {
    if (password !== "comany67") {
      setMessage("パスワードが違います。");
      return;
    }

    // 입장 허용 저장
    localStorage.setItem("bouquet-access-main-bouquet", "true");

    // 꽃다발 페이지 이동
    router.push("/bouquet/main-bouquet");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ef",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fffaf5",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: "28px", marginBottom: "16px" }}>花束</h1>

        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "10px",
            border: "1px solid #d8cbbd",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={handleEnter}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            borderRadius: "10px",
            background: "#cfe7c8",
            cursor: "pointer",
          }}
        >
          入場
        </button>

        {message && (
          <p style={{ marginTop: "14px", color: "#6b5b4d" }}>{message}</p>
        )}
      </div>
    </main>
  );
}