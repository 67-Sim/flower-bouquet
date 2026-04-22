"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [shareCode, setShareCode] = useState("main-bouquet");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleEnter = () => {
    if (!shareCode.trim()) {
      setMessage("花束コードを入力してください。");
      return;
    }

    if (password !== "comany67") {
      setMessage("パスワードが違います。");
      return;
    }

    localStorage.setItem(`bouquet-access-${shareCode}`, "true");
    router.push(`/bouquet/${shareCode}`);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ef",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px 14px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          background: "#fffaf5",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            marginTop: 0,
            marginBottom: "16px",
            lineHeight: 1.2,
          }}
        >
          花束
        </h1>

        <input
          type="text"
          placeholder="花束コード"
          value={shareCode}
          onChange={(e) => setShareCode(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "10px",
            border: "1px solid #d8cbbd",
            boxSizing: "border-box",
            fontSize: "16px",
          }}
        />

        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEnter();
          }}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "10px",
            border: "1px solid #d8cbbd",
            boxSizing: "border-box",
            fontSize: "16px",
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
            fontSize: "16px",
          }}
        >
          入場
        </button>

        {message && (
          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              color: "#6b5b4d",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}