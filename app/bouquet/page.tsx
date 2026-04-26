"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type CommentAuthor = {
  name: string | null;
};

type SeedOwner = {
  name: string | null;
};

type JoinedAuthor = CommentAuthor | CommentAuthor[] | null;
type JoinedOwner = SeedOwner | SeedOwner[] | null;

type SeedComment = {
  id: string;
  seed_id: string;
  author_id: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author?: JoinedAuthor;
};

type BouquetSeed = {
  id: string;
  owner_id: string;
  slot_number: number;
  title: string | null;
  flower_color: string | null;
  flower_shape: string | null;
  created_at: string;
  owner?: JoinedOwner;
  comments: SeedComment[];
};

const ADMIN_ID = "comany67";

const FLOWER_COLORS = [
  "#f8b4d9",
  "#f9c74f",
  "#90be6d",
  "#7bdff2",
  "#cdb4db",
  "#f28482",
  "#84a59d",
  "#ffb703",
];

const FLOWER_SHAPES = [
  {
    value: "classic",
    label: "さくら",
    borderRadius: "75% 75% 52% 52%",
    clipPath: "polygon(50% 0%, 86% 24%, 78% 78%, 50% 100%, 22% 78%, 14% 24%)",
    widthScale: 1,
    heightScale: 1.05,
    rotateOffset: 0,
  },
  {
    value: "round",
    label: "まんまる",
    borderRadius: "50%",
    clipPath: "circle(50% at 50% 50%)",
    widthScale: 1.18,
    heightScale: 0.9,
    rotateOffset: 0,
  },
  {
    value: "long",
    label: "しずく",
    borderRadius: "90% 90% 55% 55%",
    clipPath: "polygon(50% 0%, 88% 38%, 72% 100%, 28% 100%, 12% 38%)",
    widthScale: 0.88,
    heightScale: 1.22,
    rotateOffset: 0,
  },
  {
    value: "pointed",
    label: "とがり",
    borderRadius: "28%",
    clipPath: "polygon(50% 0%, 100% 58%, 72% 100%, 50% 82%, 28% 100%, 0% 58%)",
    widthScale: 1.04,
    heightScale: 1.18,
    rotateOffset: 0,
  },
  {
    value: "wide",
    label: "ちょう",
    borderRadius: "80% 20% 80% 20%",
    clipPath: "polygon(50% 0%, 100% 24%, 72% 50%, 100% 76%, 50% 100%, 0% 76%, 28% 50%, 0% 24%)",
    widthScale: 1.36,
    heightScale: 0.88,
    rotateOffset: 0,
  },
  {
    value: "heart",
    label: "ハート",
    borderRadius: "70% 70% 45% 45%",
    clipPath: "polygon(50% 100%, 10% 58%, 8% 28%, 30% 8%, 50% 28%, 70% 8%, 92% 28%, 90% 58%)",
    widthScale: 1.18,
    heightScale: 1.02,
    rotateOffset: 180,
  },
  {
    value: "leaf",
    label: "リーフ",
    borderRadius: "100% 0 100% 0",
    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
    widthScale: 0.92,
    heightScale: 1.22,
    rotateOffset: 45,
  },
  {
    value: "star",
    label: "ほし",
    borderRadius: "30%",
    clipPath: "polygon(50% 0%, 62% 34%, 98% 35%, 69% 56%, 79% 92%, 50% 70%, 21% 92%, 31% 56%, 2% 35%, 38% 34%)",
    widthScale: 1.28,
    heightScale: 1.28,
    rotateOffset: 18,
  },
];

const DEFAULT_FLOWER_SHAPE = FLOWER_SHAPES[0].value;

const getFlowerShapeConfig = (shape: string | null | undefined) => {
  return (
    FLOWER_SHAPES.find((item) => item.value === shape) ?? FLOWER_SHAPES[0]
  );
};

const SLOT_NUMBERS = Array.from({ length: 41 }, (_, i) => 5260 + i).filter(
  (num) => num !== 5285
);

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BouquetPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<BouquetSeed[]>([]);
  const [openedSlotNumber, setOpenedSlotNumber] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState(FLOWER_COLORS[0]);
  const [editShape, setEditShape] = useState(DEFAULT_FLOWER_SHAPE);
  const [commentText, setCommentText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingSeed, setSavingSeed] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const isAdmin = loggedInUserId === ADMIN_ID;

  const openedSeed = useMemo(() => {
    if (openedSlotNumber === null) return null;
    return seeds.find((seed) => seed.slot_number === openedSlotNumber) ?? null;
  }, [openedSlotNumber, seeds]);

  const isOwner = Boolean(
    openedSeed && loggedInUserId === openedSeed.owner_id
  );

  const canViewComments = Boolean(isOwner || isAdmin);

  const getOwnerName = (owner: JoinedOwner) => {
    if (Array.isArray(owner)) {
      return owner[0]?.name ?? null;
    }

    return owner?.name ?? null;
  };

  const getAuthorName = (author: JoinedAuthor) => {
    if (Array.isArray(author)) {
      return author[0]?.name ?? null;
    }

    return author?.name ?? null;
  };

  const getDisplayName = (seed: BouquetSeed) => {
    return getOwnerName(seed.owner ?? null)?.trim() || seed.owner_id;
  };

  const getCommentAuthorLabel = (comment: SeedComment) => {
    const authorName = getAuthorName(comment.author ?? null);

    if (comment.is_anonymous && !isAdmin) return "匿名";

    if (comment.is_anonymous && isAdmin) {
      return `匿名（${authorName || comment.author_id || "不明"}）`;
    }

    return authorName || comment.author_id || "不明";
  };

  const renderFlower = (seed: BouquetSeed) => {
    const color = seed.flower_color || FLOWER_COLORS[0];
    const shapeConfig = getFlowerShapeConfig(seed.flower_shape);
    const commentCount = seed.comments.length;
    const displayName = getDisplayName(seed);

    const flowerCommentCount = Math.max(commentCount - 10, 0);
    const growthRatio = Math.min(flowerCommentCount, 100) / 100;

    // NOTE:
    // 꽃 전체가 위쪽 꼭짓점 기준으로 커지는 느낌이 나지 않도록
    // 모든 꽃잎/점선/중앙 원을 같은 중심점(left:50%, top:50%) 기준으로 배치합니다.
    const size = 34 + growthRatio * 92;
    const basePetalWidth = 13 + growthRatio * 25;
    const basePetalHeight = 21 + growthRatio * 43;
    const petalWidth = basePetalWidth * shapeConfig.widthScale;
    const petalHeight = basePetalHeight * shapeConfig.heightScale;
    const petalDistance = 11 + growthRatio * 31;
    const centerSize = 17 + growthRatio * 21;
    const petalCount = flowerCommentCount === 0 ? 2 : flowerCommentCount < 30 ? 6 : 10;

    if (commentCount <= 10) {
      return (
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: "2px",
              height: "70%",
              backgroundColor: "#7aa36f",
              transform: "translateX(-50%)",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "25%",
              top: "8%",
              width: "40%",
              height: "42%",
              borderRadius: shapeConfig.borderRadius,
              clipPath: shapeConfig.clipPath,
              backgroundColor: color,
              transform: `rotate(${-25 + shapeConfig.rotateOffset}deg)`,
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "20%",
              top: "8%",
              width: "40%",
              height: "42%",
              borderRadius: shapeConfig.borderRadius,
              clipPath: shapeConfig.clipPath,
              backgroundColor: color,
              transform: `rotate(${25 + shapeConfig.rotateOffset}deg)`,
              zIndex: 2,
            }}
          />

          {/* 씨앗 상태에서도 이름 표시 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "34%",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: "#ffe8a3",
              transform: "translate(-50%, -50%)",
              zIndex: 999,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.14)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "2px",
              boxSizing: "border-box",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                color: "#4b3b2f",
                lineHeight: 1.05,
                wordBreak: "keep-all",
                whiteSpace: "normal",
              }}
            >
              {displayName}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          position: "relative",
          width: `${size}px`,
          height: `${size}px`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "visible",
          isolation: "isolate",
        }}
      >
        {/* 꽃잎 */}
        {Array.from({ length: petalCount }).map((_, i) => {
          const angle = (360 / petalCount) * i;

          return (
            <div
              key={`petal-${i}`}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 0,
                height: 0,
                transform: `rotate(${angle}deg)`,
                transformOrigin: "center center",
                zIndex: 1,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: `${petalWidth}px`,
                  height: `${petalHeight}px`,
                  borderRadius: shapeConfig.borderRadius,
                  clipPath: shapeConfig.clipPath,
                  backgroundColor: color,
                  transform: `translate(-50%, calc(-50% - ${petalDistance}px)) rotate(${shapeConfig.rotateOffset}deg)`,
                  opacity: 0.96,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                  zIndex: 1,
                }}
              />
            </div>
          );
        })}

        {/* 가운데 노란색 원과 이름은 꽃잎보다 항상 위에 표시 */}
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
            padding: "2px",
            boxSizing: "border-box",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: `${Math.max(7, centerSize * 0.25)}px`,
              fontWeight: 700,
              color: "#4b3b2f",
              lineHeight: 1.05,
              wordBreak: "keep-all",
              whiteSpace: "normal",
            }}
          >
            {displayName}
          </span>
        </div>
      </div>
    );
  };
  const loadSeeds = async () => {
    setLoading(true);
    setMessage("");

    const currentUserId = localStorage.getItem("logged-in-user-id");

    if (!currentUserId) {
      router.push("/");
      return;
    }

    setLoggedInUserId(currentUserId);

    const { data: seedRows, error: seedError } = await supabase
      .from("bouquet_seeds")
      .select(
        "id, owner_id, slot_number, title, flower_color, flower_shape, created_at, owner:users!bouquet_seeds_owner_id_fkey(name)"
      )
      .order("slot_number", { ascending: true });

    if (seedError) {
      setMessage(seedError.message);
      setLoading(false);
      return;
    }

    const seedIds = (seedRows ?? []).map((seed) => seed.id);

    let commentRows: SeedComment[] = [];

    if (seedIds.length > 0) {
      const { data: commentData, error: commentError } = await supabase
        .from("seed_comments")
        .select(
          "id, seed_id, author_id, content, is_anonymous, created_at, author:users!seed_comments_author_id_fkey(name)"
        )
        .in("seed_id", seedIds)
        .order("created_at", { ascending: true });

      if (commentError) {
        setMessage(commentError.message);
        setLoading(false);
        return;
      }

      commentRows = (commentData ?? []) as SeedComment[];
    }

    const mergedSeeds: BouquetSeed[] = ((seedRows ?? []) as BouquetSeed[]).map(
      (seed) => ({
        ...seed,
        comments: commentRows.filter((comment) => comment.seed_id === seed.id),
      })
    );

    setSeeds(mergedSeeds);
    setLoading(false);
  };

  useEffect(() => {
    loadSeeds();
  }, []);

  const handleSlotClick = (slotNumber: number) => {
    const seed = seeds.find((item) => item.slot_number === slotNumber);
    if (!seed) return;

    setOpenedSlotNumber(slotNumber);
    setCommentText("");
    setIsAnonymous(true);
    setEditTitle(seed.title || "");
    setEditColor(seed.flower_color || FLOWER_COLORS[0]);
    setEditShape(seed.flower_shape || DEFAULT_FLOWER_SHAPE);
  };

  const handleSaveSeedSettings = async () => {
    if (!openedSeed || !loggedInUserId) return;
    if (openedSeed.owner_id !== loggedInUserId && !isAdmin) return;

    setSavingSeed(true);

    const { error } = await supabase
      .from("bouquet_seeds")
      .update({
        title: editTitle,
        flower_color: editColor,
        flower_shape: editShape,
      })
      .eq("id", openedSeed.id);

    setSavingSeed(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSeeds((prev) =>
      prev.map((seed) =>
        seed.id === openedSeed.id
          ? { ...seed, title: editTitle, flower_color: editColor, flower_shape: editShape }
          : seed
      )
    );
  };

  const handleAddComment = async () => {
    if (!openedSeed || !loggedInUserId) return;
    if (!commentText.trim()) return;
    if (sendingComment) return;

    setSendingComment(true);

    const { data, error } = await supabase
      .from("seed_comments")
      .insert({
        seed_id: openedSeed.id,
        author_id: isAnonymous ? null : loggedInUserId,
        content: commentText,
        is_anonymous: isAnonymous,
      })
      .select(
        "id, seed_id, author_id, content, is_anonymous, created_at, author:users!seed_comments_author_id_fkey(name)"
      )
      .single();

    setSendingComment(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSeeds((prev) =>
      prev.map((seed) =>
        seed.id === openedSeed.id
          ? { ...seed, comments: [...seed.comments, data as SeedComment] }
          : seed
      )
    );

    setCommentText("");
    setIsAnonymous(true);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAdmin) return;

    const ok = confirm("このコメントを削除しますか？");
    if (!ok) return;

    const { error } = await supabase
      .from("seed_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSeeds((prev) =>
      prev.map((seed) => ({
        ...seed,
        comments: seed.comments.filter((comment) => comment.id !== commentId),
      }))
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("logged-in-user-id");
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
        overflowX: "hidden",
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
        <h1 style={{ fontSize: "28px", margin: 0, lineHeight: 1.2 }}>
          🌸 花束
        </h1>

        <button
          onClick={handleLogout}
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
          overflow: "visible",
        }}
      >
        {SLOT_NUMBERS.map((slotNumber) => {
          const seed = seeds.find((item) => item.slot_number === slotNumber);
          const commentCount = seed?.comments.length ?? 0;

          return (
            <button
              key={slotNumber}
              onClick={() => handleSlotClick(slotNumber)}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                border: seed ? "1px solid transparent" : "1px solid #eadfd3",
                backgroundColor: seed ? "transparent" : "#fffaf5",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "4px",
                gap: "2px",
                position: "relative",
                overflow: "visible",
                zIndex: 200 - Math.min(commentCount, 100),
              }}
            >
              {seed ? renderFlower(seed) : null}

              {!seed && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#6b5b4d",
                    lineHeight: 1.1,
                    position: "relative",
                    zIndex: 10,
                    textAlign: "center",
                  }}
                >
                  {slotNumber}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openedSeed && (
        <div
          onClick={() => {
            setOpenedSlotNumber(null);
            setCommentText("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "360px",
              maxHeight: "88vh",
              overflowY: "auto",
              backgroundColor: "#fffaf5",
              borderRadius: "18px",
              padding: "18px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "10px",
              }}
            >
              {renderFlower(openedSeed)}
            </div>

            <p
              style={{
                fontSize: "13px",
                color: "#7a6b5d",
                marginTop: 0,
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              {getDisplayName(openedSeed)}さんの種
            </p>

            <h2
              style={{
                fontSize: "20px",
                marginTop: 0,
                marginBottom: "10px",
                lineHeight: 1.3,
              }}
            >
              {openedSeed.title?.trim() || "まだ強みがありません"}
            </h2>

            {(isOwner || isAdmin) && (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="強みを入力してください"
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginBottom: "12px",
                    borderRadius: "10px",
                    border: "1px solid #d8cbbd",
                    boxSizing: "border-box",
                    fontSize: "15px",
                  }}
                />

                <div style={{ marginBottom: "12px" }}>
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      color: "#6b5b4d",
                    }}
                  >
                    花の色
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "10px",
                    }}
                  >
                    {FLOWER_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          borderRadius: "50%",
                          border:
                            editColor === color
                              ? "3px solid #6b5b4d"
                              : "2px solid #eadfd3",
                          backgroundColor: color,
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      color: "#6b5b4d",
                    }}
                  >
                    花びらの形
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "8px",
                    }}
                  >
                    {FLOWER_SHAPES.map((shape) => (
                      <button
                        key={shape.value}
                        type="button"
                        onClick={() => setEditShape(shape.value)}
                        style={{
                          minHeight: "54px",
                          borderRadius: "12px",
                          border:
                            editShape === shape.value
                              ? "3px solid #6b5b4d"
                              : "2px solid #eadfd3",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 4px",
                        }}
                      >
                        <span
                          style={{
                            width: `${18 * shape.widthScale}px`,
                            height: `${24 * shape.heightScale}px`,
                            borderRadius: shape.borderRadius,
                            clipPath: shape.clipPath,
                            backgroundColor: editColor,
                            transform: `rotate(${shape.rotateOffset}deg)`,
                            display: "block",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#6b5b4d",
                            lineHeight: 1.1,
                          }}
                        >
                          {shape.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveSeedSettings}
                  disabled={savingSeed}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginBottom: "16px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#e7c8d8",
                    cursor: savingSeed ? "default" : "pointer",
                    opacity: savingSeed ? 0.7 : 1,
                  }}
                >
                  {savingSeed ? "保存中..." : "自分の種を保存"}
                </button>
              </>
            )}

            <h3
              style={{
                fontSize: "17px",
                marginTop: 0,
                marginBottom: "10px",
              }}
            >
              コメント
            </h3>

            {canViewComments ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "14px",
                  maxHeight: "190px",
                  overflowY: "auto",
                }}
              >
                {openedSeed.comments.length === 0 ? (
                  <p
                    style={{
                      color: "#7a6b5d",
                      fontSize: "14px",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    まだコメントはありません。
                  </p>
                ) : (
                  openedSeed.comments.map((comment) => (
                    <div
                      key={comment.id}
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
                      <div>{comment.content}</div>

                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "11px",
                          color: "#8a7a6b",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <span>
                          {getCommentAuthorLabel(comment)} /{" "}
                          {formatDateTime(comment.created_at)}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#b85c5c",
                              cursor: "pointer",
                              fontSize: "11px",
                              padding: 0,
                              flexShrink: 0,
                            }}
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p
                style={{
                  color: "#7a6b5d",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  marginTop: 0,
                  marginBottom: "14px",
                }}
              >
                コメント数：{openedSeed.comments.length}
              </p>
            )}

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="この種にコメントを書いてください"
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

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                fontSize: "14px",
                color: "#6b5b4d",
              }}
            >
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              匿名で送る
            </label>

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
                  setOpenedSlotNumber(null);
                  setCommentText("");
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
                onClick={handleAddComment}
                disabled={sendingComment}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#cfe7c8",
                  cursor: sendingComment ? "default" : "pointer",
                  opacity: sendingComment ? 0.7 : 1,
                }}
              >
                {sendingComment ? "送信中..." : "送る"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}