"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_ID = "comany67";
const ADMIN_PASSWORD = "00comany0067";
const REMOVED_ID = 5285;

export default function Home() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = () => {
    const trimmedId = userId.trim();

    if (trimmedId === ADMIN_ID) {
      if (password !== ADMIN_PASSWORD) {
        setMessage("パスワードが違います。");
        return;
      }

      localStorage.setItem("logged-in-user-id", ADMIN_ID);
      router.push("/bouquet");
      return;
    }

    if (!/^\d{4}$/.test(trimmedId)) {
      setMessage("IDは4桁の番号を入力してください。");
      return;
    }

    const idNumber = Number(trimmedId);

    if (idNumber < 5260 || idNumber > 5300 || idNumber === REMOVED_ID) {
      setMessage("このIDは利用できません。");
      return;
    }

    const expectedPassword = `00${trimmedId}`;

    if (password !== expectedPassword) {
      setMessage("パスワードが違います。");
      return;
    }

    localStorage.setItem("logged-in-user-id", trimmedId);
    router.push("/bouquet");
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
          placeholder="ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
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
            if (e.key === "Enter") handleLogin();
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
          onClick={handleLogin}
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
          ログイン
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