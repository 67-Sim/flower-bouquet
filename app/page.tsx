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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setChecking(false);
  }, []);

  const validateUserId = () => {
    const trimmedUserId = userId.trim();

    if (!trimmedUserId) {
      setMessage("番号を入力してください。");
      return null;
    }

    if (trimmedUserId === ADMIN_ID) {
      return { trimmedUserId, isAdmin: true };
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

    return { trimmedUserId, isAdmin: false };
  };

  const handleSetPassword = async () => {
    const input = validateUserId();
    if (!input) return;

    const { trimmedUserId, isAdmin } = input;
    const trimmedPassword = password.trim();

    if (isAdmin) {
      setMessage("管理者パスワードはここでは設定できません。");
      return;
    }

    if (!trimmedPassword) {
      setMessage("設定するパスワードを入力してください。");
      return;
    }

    setWorking(true);
    setMessage("");

    const { data: user, error } = await supabase
      .from("users")
      .select("id, password")
      .eq("id", trimmedUserId)
      .single();

    if (error || !user) {
      setWorking(false);
      setMessage("この番号は登録されていません。");
      return;
    }

    if (user.password) {
      setWorking(false);
      setMessage("すでにパスワードがあります。変更する場合は下の変更欄を使ってください。");
      return;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ password: trimmedPassword })
      .eq("id", trimmedUserId)
      .select("id, password")
      .single();

    setWorking(false);

    if (updateError || !updatedUser) {
      setMessage(updateError?.message || "パスワード設定に失敗しました。");
      return;
    }

    setMessage("パスワードを設定しました。");
  };

  const handleChangePassword = async () => {
    const input = validateUserId();
    if (!input) return;

    const { trimmedUserId, isAdmin } = input;
    const trimmedCurrentPassword = currentPassword.trim();
    const trimmedNewPassword = newPassword.trim();

    if (isAdmin) {
      setMessage("管理者パスワードはここでは変更できません。");
      return;
    }

    if (!trimmedCurrentPassword) {
      setMessage("現在のパスワードを入力してください。");
      return;
    }

    if (!trimmedNewPassword) {
      setMessage("新しいパスワードを入力してください。");
      return;
    }

    setWorking(true);
    setMessage("");

    const { data: user, error } = await supabase
      .from("users")
      .select("id, password")
      .eq("id", trimmedUserId)
      .single();

    if (error || !user) {
      setWorking(false);
      setMessage("この番号は登録されていません。");
      return;
    }

    if (!user.password) {
      setWorking(false);
      setMessage("まだパスワードが設定されていません。先に設定してください。");
      return;
    }

    if (user.password !== trimmedCurrentPassword) {
      setWorking(false);
      setMessage("現在のパスワードが違います。");
      return;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ password: trimmedNewPassword })
      .eq("id", trimmedUserId)
      .select("id, password")
      .single();

    setWorking(false);

    if (updateError || !updatedUser) {
      setMessage(updateError?.message || "パスワード変更に失敗しました。");
      return;
    }

    setPassword(trimmedNewPassword);
    setCurrentPassword("");
    setNewPassword("");
    setMessage("パスワードを変更しました。");
  };

  const handleLogin = async () => {
    const input = validateUserId();
    if (!input) return;

    const { trimmedUserId, isAdmin } = input;
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setMessage("パスワードを入力してください。");
      return;
    }

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
        <h1 style={{ fontSize: "30px", margin: "0 0 10px", color: "#2f2a25" }}>
          🌸 花束
        </h1>

        <p style={{ fontSize: "14px", color: "#7a6b5d", lineHeight: 1.6 }}>
          番号とパスワードを入力してください。
        </p>

        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setMessage("");
          }}
          placeholder="番号 例：5261"
          inputMode="numeric"
          style={inputStyle}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setMessage("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          placeholder="パスワード"
          style={inputStyle}
        />

        <button onClick={handleSetPassword} disabled={working} style={subButtonStyle}>
          初回パスワード設定
        </button>

        <hr style={{ border: "none", borderTop: "1px solid #eadfd3", margin: "18px 0" }} />

        <p style={{ fontSize: "13px", color: "#7a6b5d", lineHeight: 1.5 }}>
          パスワードを変更する場合
        </p>

        <input
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            setMessage("");
          }}
          placeholder="現在のパスワード"
          style={inputStyle}
        />

        <input
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setMessage("");
          }}
          placeholder="新しいパスワード"
          style={inputStyle}
        />

        <button onClick={handleChangePassword} disabled={working} style={subButtonStyle}>
          パスワード変更
        </button>

        {message && (
          <p
            style={{
              margin: "14px 0",
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

        <button onClick={handleLogin} disabled={working} style={mainButtonStyle}>
          {working ? "確認中..." : "入る"}
        </button>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
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
};

const subButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid #d8cbbd",
  backgroundColor: "#fff7df",
  color: "#2f2a25",
  WebkitTextFillColor: "#2f2a25",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer",
  marginBottom: "10px",
};

const mainButtonStyle: React.CSSProperties = {
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
};