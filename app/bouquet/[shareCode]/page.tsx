"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Bouquet = {
  id: string;
  title: string;
  share_code: string;
};

type FlowerMessage = {
  id: string;
  flower_id: string;
  content: string;
  created_at: string;
};

type Flower = {
  id: string;
  bouquet_id: string;
  slot_index: number;
  seed_text: string;
  created_at?: string;
  messages: FlowerMessage[];
};

export default function BouquetPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const shareCode = params.shareCode as string;

  const totalSlots = 50;

  const [bouquet, setBouquet] = useState<Bouquet | null>(null);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [openedFlowerIndex, setOpenedFlowerIndex] = useState<number | null>(null);
  const [createText, setCreateText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedFlower = useMemo(() => {
    if (openedFlowerIndex === null) return null;
    return flowers.find((flower) => flower.slot_index === openedFlowerIndex) ?? null;
  }, [openedFlowerIndex, flowers]);

  const getFlowerEmoji = (flower: Flower) => {
    const count = flower.messages.length;
    if (count === 0) return "🌱";
    if (count <= 2) return "🌿";
    return "🌸";
  };

  const loadBouquetData = async () => {
    setLoading(true);
    setMessage("");

    const { data: bouquetRow, error: bouquetError } = await supabase
      .from("bouquets")
      .select("id, title, share_code")
      .eq("share_code", shareCode)
      .maybeSingle();

    if (bouquetError) {
      setMessage(bouquetError.message);
      setLoading(false);
      return;
    }

    if (!bouquetRow) {
      setMessage("花束が見つかりません。");
      setLoading(false);
      return;
    }

    setBouquet(bouquetRow);

    const { data: flowerRows, error: flowerError } = await supabase
      .from("flowers")
      .select("id, bouquet_id, slot_index, seed_text, created_at")
      .eq("bouquet_id", bouquetRow.id)
      .order("slot_index", { ascending: true });

    if (flowerError) {
      setMessage(flowerError.message);
      setLoading(false);
      return;
    }

    const flowerIds = (flowerRows ?? []).map((f) => f.id);
    let messageRows: FlowerMessage[] = [];

    if (flowerIds.length > 0) {
      const { data: msgData, error: msgError } = await supabase
        .from("flower_messages")
        .select("id, flower_id, content, created_at")
        .in("flower_id", flowerIds)
        .order("created_at", { ascending: true });

      if (msgError) {
        setMessage(msgError.message);
        setLoading(false);
        return;
      }

      messageRows = msgData ?? [];
    }

    const mergedFlowers: Flower[] = (flowerRows ?? []).map((flower) => ({
      ...flower,
      messages: messageRows.filter((m) => m.flower_id === flower.id),
    }));

    setFlowers(mergedFlowers);
    setLoading(false);
  };

  useEffect(() => {
    const allowed = localStorage.getItem(`bouquet-access-${shareCode}`);

    if (!allowed) {
      router.push("/");
      return;
    }

    loadBouquetData();
  }, [shareCode]);

  const handleSlotClick = (index: number) => {
    const flower = flowers.find((f) => f.slot_index === index);

    if (flower) {
      setOpenedFlowerIndex(index);
      setMessageText("");
      return;
    }

    setSelectedSlot(index);
    setCreateText("");
  };

  const handleCreateFlower = async () => {
    if (!bouquet || selectedSlot === null) return;
    if (!createText.trim()) return;

    const exists = flowers.some((f) => f.slot_index === selectedSlot);
    if (exists) {
      setMessage("その場所にはすでに花があります。");
      return;
    }

    const { data, error } = await supabase
      .from("flowers")
      .insert({
        bouquet_id: bouquet.id,
        slot_index: selectedSlot,
        seed_text: createText,
      })
      .select("id, bouquet_id, slot_index, seed_text, created_at")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setFlowers((prev) => [...prev, { ...data, messages: [] }]);
    setSelectedSlot(null);
    setCreateText("");
  };

  const handleAddMessage = async () => {
    if (!selectedFlower) return;
    if (!messageText.trim()) return;

    const { data, error } = await supabase
      .from("flower_messages")
      .insert({
        flower_id: selectedFlower.id,
        content: messageText,
      })
      .select("id, flower_id, content, created_at")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setFlowers((prev) =>
      prev.map((flower) => {
        if (flower.id !== selectedFlower.id) return flower;
        return {
          ...flower,
          messages: [...flower.messages, data],
        };
      })
    );

    setMessageText("");
  };

  const handleExit = () => {
    localStorage.removeItem(`bouquet-access-${shareCode}`);
    router.push("/");
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f7f4ef",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px 14px",
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
        backgroundColor: "#f7f4ef",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 14px 32px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "12px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          🌸 {bouquet?.title ?? "花束"}
        </h1>

        <button
          onClick={handleExit}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #d8cbbd",
            backgroundColor: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          戻る
        </button>
      </div>

      {message && (
        <p
          style={{
            width: "100%",
            maxWidth: "420px",
            marginBottom: "14px",
            color: "#8a4b4b",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "10px",
        }}
      >
        {Array.from({ length: totalSlots }).map((_, index) => {
          const flower = flowers.find((f) => f.slot_index === index);

          return (
            <button
              key={index}
              onClick={() => handleSlotClick(index)}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                border: "2px dashed #c9b8a6",
                backgroundColor: "#fffaf5",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              {flower ? getFlowerEmoji(flower) : "+"}
            </button>
          );
        })}
      </div>

      {selectedSlot !== null && (
        <div
          onClick={() => setSelectedSlot(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
            zIndex: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "360px",
              backgroundColor: "#fffaf5",
              borderRadius: "18px",
              padding: "18px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                marginTop: 0,
                marginBottom: "10px",
                lineHeight: 1.3,
              }}
            >
              新しい花を作る
            </h2>

            <p
              style={{
                marginBottom: "12px",
                color: "#6b5b4d",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              スロット {selectedSlot + 1} に植える言葉を書いてください。
            </p>

            <textarea
              value={createText}
              onChange={(e) => setCreateText(e.target.value)}
              placeholder="言葉を入力してください"
              style={{
                width: "100%",
                minHeight: "96px",
                borderRadius: "12px",
                border: "1px solid #d8cbbd",
                padding: "12px",
                fontSize: "16px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              <button
                onClick={() => setSelectedSlot(null)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d8cbbd",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>

              <button
                onClick={handleCreateFlower}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#e7c8d8",
                  cursor: "pointer",
                }}
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFlower && (
        <div
          onClick={() => {
            setOpenedFlowerIndex(null);
            setMessageText("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
            zIndex: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "360px",
              backgroundColor: "#fffaf5",
              borderRadius: "18px",
              padding: "18px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                fontSize: "36px",
                marginBottom: "10px",
              }}
            >
              {getFlowerEmoji(selectedFlower)}
            </div>

            <h2
              style={{
                fontSize: "22px",
                marginTop: 0,
                marginBottom: "8px",
                lineHeight: 1.3,
              }}
            >
              花のことば
            </h2>

            <p
              style={{
                backgroundColor: "#fff",
                border: "1px solid #eadfd3",
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "14px",
                lineHeight: 1.6,
                fontSize: "14px",
                wordBreak: "break-word",
              }}
            >
              {selectedFlower.seed_text}
            </p>

            <h3
              style={{
                fontSize: "17px",
                marginTop: 0,
                marginBottom: "10px",
              }}
            >
              メッセージ
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "14px",
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              {selectedFlower.messages.length === 0 ? (
                <p
                  style={{
                    color: "#7a6b5d",
                    fontSize: "14px",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  まだメッセージはありません。
                </p>
              ) : (
                selectedFlower.messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #eadfd3",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      lineHeight: 1.5,
                      fontSize: "14px",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </div>
                ))
              )}
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="この花にメッセージを書いてください"
              style={{
                width: "100%",
                minHeight: "90px",
                borderRadius: "12px",
                border: "1px solid #d8cbbd",
                padding: "12px",
                fontSize: "16px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              <button
                onClick={() => {
                  setOpenedFlowerIndex(null);
                  setMessageText("");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d8cbbd",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
              >
                閉じる
              </button>

              <button
                onClick={handleAddMessage}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#cfe7c8",
                  cursor: "pointer",
                }}
              >
                送る
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}