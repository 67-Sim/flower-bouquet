"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_ID = "comany67";

const SLOT_NUMBERS = Array.from({ length: 41 }, (_, i) => 5260 + i).filter(
  (num) => num !== 5285,
);

export default function LoginPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem("logged-in-user-id");

    if (savedUserId) {
      router.replace("/bouquet");
      return;
    }

    setChecking(false);
  }, [router]);

  const handleLogin = () => {
    const trimmedUserId = userId.trim();

    if (!trimmedUserId) {
      setMessage("番号を入力してください。");
      return;
    }

    if (trimmedUserId === ADMIN_ID) {
      localStorage.setItem("logged-in-user-id", ADMIN_ID);
      router.push("/bouquet");
      return;
    }

    const slotNumber = Number(trimmedUserId);

    if (!Number.isInteger(slotNumber)) {
      setMessage("4桁の番号を入力してください。");
      return;
    }

    if (!SLOT_NUMBERS.includes(slotNumber)) {
      setMessage("使える番号は5260〜5300です。5285は使えません。");
      return;
    }

    localStorage.setItem("logged-in-user-id", String(slotNumber));
    router.push("/bouquet");
  };

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fffaf5",
          color: "#2f2a25",
        }}
      >
        読み込み中...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#fffaf5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        color: "#2f2a25",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          backgroundColor: "#ffffff",
          borderRadius: "22px",
          padding: "28px 22px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
          border: "1px solid #eadfd3",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "30px",
            margin: "0 0 10px",
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            opacity: 1,
          }}
        >
          🌸 花束
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#7a6b5d",
            lineHeight: 1.6,
            margin: "0 0 22px",
          }}
        >
          自分の番号を入力してください。
        </p>

        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setMessage("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLogin();
            }
          }}
          placeholder="例：5261"
          inputMode="numeric"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid #d8cbbd",
            boxSizing: "border-box",
            fontSize: "18px",
            textAlign: "center",
            marginBottom: "14px",
            backgroundColor: "#fff",
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            opacity: 1,
            outline: "none",
          }}
        />

        {message && (
          <p
            style={{
              margin: "0 0 14px",
              color: "#b85c5c",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            backgroundColor: "#e7c8d8",
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            opacity: 1,
          }}
        >
          入る
        </button>
      </div>
    </main>
  );
}