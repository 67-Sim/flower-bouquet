"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const ADMIN_ID = "comany67";

const FLOWER_COLORS = [
  "#f8b4d9",
  "#f9c74f",
  "#90be6d",
  "#7bdff2",
  "#cdb4db",
  "#f28482",
];

type WorryComment = {
  id: string;
  worry_seed_id: string;
  author_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
};

type WorrySeed = {
  id: string;
  creator_id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  is_anonymous: boolean;
  visibility: string;
  flower_color: string;
  flower_shape: string;
  created_at: string;
  comments: WorryComment[];
};

export default function BackgroundPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [worrySeeds, setWorrySeeds] = useState<WorrySeed[]>([]);
  const [clickedPosition, setClickedPosition] = useState<{ x: number; y: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newAnonymous, setNewAnonymous] = useState(true);
  const [newVisibility, setNewVisibility] = useState("owner");

  const [openedSeedId, setOpenedSeedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(true);

  const [isEditingSeed, setIsEditingSeed] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editAnonymous, setEditAnonymous] = useState(true);
  const [editVisibility, setEditVisibility] = useState("owner");

  const openedSeed = useMemo(() => {
    return worrySeeds.find((seed) => seed.id === openedSeedId) ?? null;
  }, [openedSeedId, worrySeeds]);

  const isAdmin = loggedInUserId === ADMIN_ID;

  const canEditOpenedSeed =
    openedSeed &&
    loggedInUserId &&
    (openedSeed.creator_id === loggedInUserId || isAdmin);

  const textStyle = {
    color: "#2f2a25",
    WebkitTextFillColor: "#2f2a25",
    opacity: 1,
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d8cbbd",
    boxSizing: "border-box" as const,
    backgroundColor: "#fffaf5",
    color: "#2f2a25",
    WebkitTextFillColor: "#2f2a25",
    caretColor: "#2f2a25",
    opacity: 1,
    fontSize: "15px",
  };

  const loadSeeds = async () => {
    const currentUserId = localStorage.getItem("logged-in-user-id");

    if (!currentUserId) {
      router.push("/");
      return;
    }

    setLoggedInUserId(currentUserId);

    const { data: seedRows, error: seedError } = await supabase
      .from("worry_seeds")
      .select("*")
      .order("created_at", { ascending: true });

    if (seedError) {
      console.log(seedError.message);
      return;
    }

    const seedIds = (seedRows ?? []).map((seed) => seed.id);

    let commentRows: WorryComment[] = [];

    if (seedIds.length > 0) {
      const { data: commentData } = await supabase
        .from("worry_comments")
        .select("*")
        .in("worry_seed_id", seedIds)
        .order("created_at", { ascending: true });

      commentRows = (commentData ?? []) as WorryComment[];
    }

    const mergedSeeds: WorrySeed[] = (seedRows ?? []).map((seed) => ({
      ...seed,
      comments: commentRows.filter((comment) => comment.worry_seed_id === seed.id),
    }));

    setWorrySeeds(mergedSeeds);
  };

  useEffect(() => {
    loadSeeds();
  }, []);

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.seed === "true") return;

    const rect = e.currentTarget.getBoundingClientRect();

    setClickedPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    setShowCreateModal(true);
  };

  const handleCreateSeed = async () => {
    if (!clickedPosition || !loggedInUserId) return;
    if (!newTitle.trim()) return;
    if (!newContent.trim()) return;

    const { data, error } = await supabase
      .from("worry_seeds")
      .insert({
        creator_id: loggedInUserId,
        x: clickedPosition.x,
        y: clickedPosition.y,
        title: newTitle,
        content: newContent,
        is_anonymous: newAnonymous,
        visibility: newVisibility,
        flower_color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
      })
      .select()
      .single();

    if (error) {
      console.log(error.message);
      return;
    }

    setWorrySeeds((prev) => [...prev, { ...(data as WorrySeed), comments: [] }]);

    setShowCreateModal(false);
    setNewTitle("");
    setNewContent("");
    setNewAnonymous(true);
    setNewVisibility("owner");
  };

  const handleAddComment = async () => {
    if (!openedSeed || !loggedInUserId) return;
    if (!commentText.trim()) return;

    const { data, error } = await supabase
      .from("worry_comments")
      .insert({
        worry_seed_id: openedSeed.id,
        author_id: loggedInUserId,
        content: commentText,
        is_anonymous: commentAnonymous,
      })
      .select()
      .single();

    if (error) {
      console.log(error.message);
      return;
    }

    setWorrySeeds((prev) =>
      prev.map((seed) =>
        seed.id === openedSeed.id
          ? { ...seed, comments: [...seed.comments, data as WorryComment] }
          : seed
      )
    );

    setCommentText("");
    setCommentAnonymous(true);
  };

  const handleStartEditSeed = () => {
    if (!openedSeed) return;

    setEditTitle(openedSeed.title);
    setEditContent(openedSeed.content);
    setEditAnonymous(openedSeed.is_anonymous);
    setEditVisibility(openedSeed.visibility);
    setIsEditingSeed(true);
  };

  const handleSaveEditSeed = async () => {
    if (!openedSeed || !loggedInUserId) return;
    if (!canEditOpenedSeed) return;
    if (!editTitle.trim()) return;
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from("worry_seeds")
      .update({
        title: editTitle,
        content: editContent,
        is_anonymous: editAnonymous,
        visibility: editVisibility,
      })
      .eq("id", openedSeed.id);

    if (error) {
      console.log(error.message);
      return;
    }

    setWorrySeeds((prev) =>
      prev.map((seed) =>
        seed.id === openedSeed.id
          ? {
              ...seed,
              title: editTitle,
              content: editContent,
              is_anonymous: editAnonymous,
              visibility: editVisibility,
            }
          : seed
      )
    );

    setIsEditingSeed(false);
  };

  const handleDeleteWorrySeed = async () => {
    if (!openedSeed || !loggedInUserId) return;
    if (!canEditOpenedSeed) return;

    const ok = confirm("この悩みの新芽を削除しますか？");
    if (!ok) return;

    const { error } = await supabase
      .from("worry_seeds")
      .delete()
      .eq("id", openedSeed.id);

    if (error) {
      console.log(error.message);
      return;
    }

    setWorrySeeds((prev) => prev.filter((seed) => seed.id !== openedSeed.id));
    setOpenedSeedId(null);
    setIsEditingSeed(false);
  };

  const handleDeleteWorryComment = async (commentId: string) => {
    if (!openedSeed || !loggedInUserId) return;

    const targetComment = openedSeed.comments.find((comment) => comment.id === commentId);
    if (!targetComment) return;

    const canDelete =
      targetComment.author_id === loggedInUserId ||
      openedSeed.creator_id === loggedInUserId ||
      isAdmin;

    if (!canDelete) return;

    const ok = confirm("このコメントを削除しますか？");
    if (!ok) return;

    const { error } = await supabase
      .from("worry_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.log(error.message);
      return;
    }

    setWorrySeeds((prev) =>
      prev.map((seed) =>
        seed.id === openedSeed.id
          ? {
              ...seed,
              comments: seed.comments.filter((comment) => comment.id !== commentId),
            }
          : seed
      )
    );
  };

  const renderSeed = (seed: WorrySeed) => {
    const commentCount = seed.comments.length;
    const color = seed.flower_color || "#f8b4d9";

    const seedStage = Math.min(commentCount, 4);
    const stemHeightByStage = [20, 30, 42, 52, 62];
    const stemHeight = stemHeightByStage[seedStage];

    const bloomCommentCount = Math.max(commentCount - 5, 0);
    const growthRatio = Math.min(bloomCommentCount, 80) / 80;

    const flowerSize = 46 + growthRatio * 72;
    const petalWidth = 16 + growthRatio * 20;
    const petalHeight = 24 + growthRatio * 36;
    const petalDistance = 14 + growthRatio * 28;
    const centerSize = 28 + growthRatio * 14;

    if (commentCount < 5) {
      return (
        <div data-seed="true" style={{ width: "70px", height: "90px", position: "relative", overflow: "visible" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "8px",
              width: commentCount === 0 ? "2px" : "3px",
              height: `${stemHeight}px`,
              backgroundColor: "#7aa36f",
              borderRadius: "999px",
              transform: "translateX(-50%)",
              zIndex: 1,
            }}
          />

          {commentCount >= 3 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: `${stemHeight * 0.42 + 8}px`,
                width: "20px",
                height: "12px",
                borderRadius: "100% 0 100% 0",
                backgroundColor: "#8fbc7a",
                transform: "translateX(-95%) rotate(-28deg)",
                transformOrigin: "right center",
                zIndex: 2,
              }}
            />
          )}

          {commentCount >= 4 && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: `${stemHeight * 0.62 + 8}px`,
                width: "22px",
                height: "13px",
                borderRadius: "0 100% 0 100%",
                backgroundColor: "#79aa68",
                transform: "translateX(-5%) rotate(28deg)",
                transformOrigin: "left center",
                zIndex: 2,
              }}
            />
          )}

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: `${stemHeight + 2}px`,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#ffe8a3",
              transform: "translateX(-50%)",
              zIndex: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.14)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "3px",
              boxSizing: "border-box",
              color: "#4b3b2f",
              WebkitTextFillColor: "#4b3b2f",
              opacity: 1,
              fontSize: "8px",
              fontWeight: 700,
              lineHeight: 1.05,
              overflow: "hidden",
            }}
          >
            {seed.title}
          </div>
        </div>
      );
    }

    return (
      <div
        data-seed="true"
        style={{
          position: "relative",
          width: `${flowerSize}px`,
          height: `${flowerSize}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "visible",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (360 / 8) * i;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 0,
                height: 0,
                transform: `rotate(${angle}deg)`,
                transformOrigin: "center center",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: `${petalWidth}px`,
                  height: `${petalHeight}px`,
                  borderRadius: "75% 75% 52% 52%",
                  backgroundColor: color,
                  transform: `translate(-50%, calc(-50% - ${petalDistance}px))`,
                  opacity: 0.96,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                }}
              />
            </div>
          );
        })}

        <div
          style={{
            width: `${centerSize}px`,
            height: `${centerSize}px`,
            borderRadius: "50%",
            backgroundColor: "#ffe8a3",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.16)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "3px",
            boxSizing: "border-box",
            textAlign: "center",
            overflow: "hidden",
            color: "#4b3b2f",
            WebkitTextFillColor: "#4b3b2f",
            opacity: 1,
            fontSize: `${Math.max(8, centerSize * 0.23)}px`,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {seed.title}
        </div>
      </div>
    );
  };

  return (
    <main
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: "#f7f4ef",
        overflow: "hidden",
        position: "relative",
        ...textStyle,
      }}
    >
      <button
        onClick={() => router.push("/bouquet")}
        style={{
          position: "fixed",
          top: "14px",
          left: "14px",
          zIndex: 999,
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #d8cbbd",
          backgroundColor: "#fff",
          cursor: "pointer",
          ...textStyle,
        }}
      >
        戻る
      </button>

      <div onClick={handleBackgroundClick} style={{ width: "100%", height: "100%", position: "relative" }}>
        {worrySeeds.map((seed) => (
          <div
            key={seed.id}
            data-seed="true"
            onClick={(e) => {
              e.stopPropagation();
              setOpenedSeedId(seed.id);
              setIsEditingSeed(false);
            }}
            style={{
              position: "absolute",
              left: `${seed.x}px`,
              top: `${seed.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {renderSeed(seed)}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
            zIndex: 1000,
          }}
        >
          <div style={{ width: "100%", maxWidth: "360px", backgroundColor: "#fffaf5", borderRadius: "18px", padding: "18px", ...textStyle }}>
            <h2 style={textStyle}>悩みの新芽</h2>

            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={8}
              placeholder="タイトル（8文字まで）"
              style={{ ...inputStyle, marginBottom: "12px" }}
            />

            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="悩みを書いてください"
              style={{ ...inputStyle, minHeight: "100px" }}
            />

            <label style={{ display: "flex", gap: "8px", marginTop: "10px", ...textStyle }}>
              <input type="checkbox" checked={newAnonymous} onChange={(e) => setNewAnonymous(e.target.checked)} />
              匿名で作る
            </label>

            <select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value)} style={{ ...inputStyle, marginTop: "12px" }}>
              <option value="owner">コメントは自分だけ見る</option>
              <option value="public">コメントをみんなに公開</option>
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #d8cbbd", backgroundColor: "#fff", cursor: "pointer", ...textStyle }}>
                閉じる
              </button>

              <button onClick={handleCreateSeed} style={{ padding: "10px 14px", borderRadius: "10px", border: "none", backgroundColor: "#cfe7c8", cursor: "pointer", ...textStyle }}>
                作る
              </button>
            </div>
          </div>
        </div>
      )}

      {openedSeed && (
        <div
          onClick={() => {
            setOpenedSeedId(null);
            setIsEditingSeed(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
            zIndex: 1000,
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
              maxHeight: "85vh",
              overflowY: "auto",
              ...textStyle,
            }}
          >
            {!isEditingSeed ? (
              <>
                <h2 style={textStyle}>{openedSeed.title}</h2>

                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, ...textStyle }}>
                  {openedSeed.content}
                </p>

                {canEditOpenedSeed && (
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <button
                      onClick={handleStartEditSeed}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid #d8cbbd",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        ...textStyle,
                      }}
                    >
                      悩みを修正する
                    </button>

                    <button
                      onClick={handleDeleteWorrySeed}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid #e3b5b5",
                        backgroundColor: "#fff5f5",
                        cursor: "pointer",
                        color: "#b85c5c",
                        WebkitTextFillColor: "#b85c5c",
                        opacity: 1,
                      }}
                    >
                      削除
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 style={textStyle}>悩みを修正</h2>

                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={8}
                  placeholder="タイトル（8文字まで）"
                  style={{ ...inputStyle, marginBottom: "12px" }}
                />

                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="悩みを書いてください"
                  style={{ ...inputStyle, minHeight: "100px" }}
                />

                <label style={{ display: "flex", gap: "8px", marginTop: "10px", ...textStyle }}>
                  <input type="checkbox" checked={editAnonymous} onChange={(e) => setEditAnonymous(e.target.checked)} />
                  匿名で作る
                </label>

                <select value={editVisibility} onChange={(e) => setEditVisibility(e.target.value)} style={{ ...inputStyle, marginTop: "12px" }}>
                  <option value="owner">コメントは自分だけ見る</option>
                  <option value="public">コメントをみんなに公開</option>
                </select>

                <div style={{ display: "flex", gap: "8px", marginTop: "12px", marginBottom: "12px" }}>
                  <button
                    onClick={() => setIsEditingSeed(false)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid #d8cbbd",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      ...textStyle,
                    }}
                  >
                    キャンセル
                  </button>

                  <button
                    onClick={handleSaveEditSeed}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#cfe7c8",
                      cursor: "pointer",
                      ...textStyle,
                    }}
                  >
                    保存
                  </button>
                </div>
              </>
            )}

            <h3 style={textStyle}>コメント</h3>

            {openedSeed.visibility === "public" ||
            openedSeed.creator_id === loggedInUserId ||
            isAdmin ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {openedSeed.comments.map((comment) => {
                  const canDeleteComment =
                    comment.author_id === loggedInUserId ||
                    openedSeed.creator_id === loggedInUserId ||
                    isAdmin;

                  return (
                    <div key={comment.id} style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "10px", ...textStyle }}>
                      <div>{comment.content}</div>

                      {canDeleteComment && (
                        <button
                          onClick={() => handleDeleteWorryComment(comment.id)}
                          style={{
                            marginTop: "6px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            padding: 0,
                            fontSize: "12px",
                            color: "#b85c5c",
                            WebkitTextFillColor: "#b85c5c",
                            opacity: 1,
                          }}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={textStyle}>コメント数：{openedSeed.comments.length}</p>
            )}

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="コメントを書く"
              style={{ ...inputStyle, minHeight: "90px" }}
            />

            <label style={{ display: "flex", gap: "8px", marginTop: "10px", ...textStyle }}>
              <input type="checkbox" checked={commentAnonymous} onChange={(e) => setCommentAnonymous(e.target.checked)} />
              匿名で送る
            </label>

            <button
              onClick={handleAddComment}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#cfe7c8",
                cursor: "pointer",
                ...textStyle,
              }}
            >
              コメント送信
            </button>
          </div>
        </div>
      )}
    </main>
  );
}