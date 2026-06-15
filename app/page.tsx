"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const ADMIN_ID = "comany67";

const SLOT_NUMBERS = Array.from({ length: 41 }, (_, i) => 5260 + i).filter(
  (num) => num !== 5285,
);

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setChecking(false);
  }, []);

  const validateInput = () => {
    const trimmedUserId = userId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUserId) {
      setMessage("番号を入力してください。");
      return null;
    }

    if (!trimmedPassword) {
      setMessage("パスワードを入力してください。");
      return null;
    }

    if (trimmedUserId === ADMIN_ID) {
      return { trimmedUserId, trimmedPassword, isAdmin: true };
    }

    const slotNumber = Number(trimmedUserId);

    if (!Number.isInteger(slotNumber)) {
      setMessage("4桁の番号を入力してください。");
      return null;
    }

    if (!SLOT_NUMBERS.includes(slotNumber)) {
      setMessage("使える番号は5260〜5300です。5285は使えません。");
      return null;
    }

    return { trimmedUserId, trimmedPassword, isAdmin: false };
  };

  const handleSetPassword = async () => {
    const input = validateInput();
    if (!input) return;

    const { trimmedUserId, trimmedPassword, isAdmin } = input;

    if (isAdmin) {
      setMessage("管理者パスワードはここでは設定できません。");
      return;
    }

    setWorking(true);
    setMessage("");

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", trimmedUserId)
      .single();

    if (error || !user) {
      setWorking(false);
      setMessage("この番号は登録されていません。");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ password: trimmedPassword })
      .eq("id", trimmedUserId);

    setWorking(false);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setMessage("パスワードを設定・変更しました。");
  };

  const handleLogin = async () => {
    const input = validateInput();
    if (!input) return;

    const { trimmedUserId, trimmedPassword, isAdmin } = input;

    if (isAdmin) {
      if (trimmedPassword !== `00${ADMIN_ID}`) {
        setMessage("パスワードが違います。");
        return;
      }

      localStorage.setItem("logged-in-user-id", ADMIN_ID);
      router.push("/bouquet");
      return;
    }

    setWorking(true);
    setMessage("");

    const { data: user, error } = await supabase
      .from("users")
      .select("id, password")
      .eq("id", trimmedUserId)
      .single();

    setWorking(false);

    if (error || !user) {
      setMessage("この番号は登録されていません。");
      return;
    }

    if (!user.password) {
      setMessage("まだパスワードが設定されていません。先に設定してください。");
      return;
    }

    if (user.password !== trimmedPassword) {
      setMessage("パスワードが違います。");
      return;
    }

    localStorage.setItem("logged-in-user-id", trimmedUserId);
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
          初めて入る時、または変更したい時は、番号とパスワードを入力して
          「パスワード設定 / 変更」を押してください。
        </p>

        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setMessage("");
          }}
          placeholder="番号 例：5261"
          inputMode="numeric"
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid #d8cbbd",
            boxSizing: "border-box",
            fontSize: "18px",
            textAlign: "center",
            marginBottom: "12px",
            backgroundColor: "#fff",
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            opacity: 1,
            outline: "none",
          }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setMessage("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLogin();
            }
          }}
          placeholder="パスワード"
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
              color:
                message.includes("設定") || message.includes("変更")
                  ? "#4f8a5b"
                  : "#b85c5c",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        )}

        <button
          onClick={handleSetPassword}
          disabled={working}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: "14px",
            border: "1px solid #d8cbbd",
            backgroundColor: "#fff7df",
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            fontSize: "15px",
            fontWeight: 700,
            cursor: working ? "not-allowed" : "pointer",
            opacity: working ? 0.7 : 1,
            marginBottom: "10px",
          }}
        >
          パスワード設定 / 変更
        </button>

        <button
          onClick={handleLogin}
          disabled={working}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "14px",
            border: "none",
            backgroundColor: working ? "#d8b5c5" : "#e7c8d8",
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            fontSize: "16px",
            fontWeight: 700,
            cursor: working ? "not-allowed" : "pointer",
            opacity: 1,
          }}
        >
          {working ? "確認中..." : "入る"}
        </button>
      </div>
    </main>
  );
}