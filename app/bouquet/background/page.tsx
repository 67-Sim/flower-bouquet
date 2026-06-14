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

type AppUser = {
  id: string;
  name: string;
};

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

type BouquetSeed = {
  id: string;
  slot_number: number;
  title: string | null;
  flower_color: string | null;
  x: number | null;
  y: number | null;
  commentCount: number;
};

export default function BackgroundPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [bouquetSeeds, setBouquetSeeds] = useState<BouquetSeed[]>([]);
  const [worrySeeds, setWorrySeeds] = useState<WorrySeed[]>([]);
  const [clickedPosition, setClickedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
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

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return "不明";
    return userNameMap[userId] ?? userId;
  };

  const getSeedAuthorName = (seed: WorrySeed) => {
    return seed.is_anonymous ? "匿名" : getUserName(seed.creator_id);
  };

  const getCommentAuthorName = (comment: WorryComment) => {
    return comment.is_anonymous ? "匿名" : getUserName(comment.author_id);
  };

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

  const visibilityButtonStyle = (active: boolean) => ({
    flex: 1,
    padding: "10px",
    borderRadius: "10px",
    border: active ? "2px solid #7aa36f" : "1px solid #d8cbbd",
    backgroundColor: active ? "#e7f3e2" : "#fff",
    cursor: "pointer",
    fontSize: "14px",
    ...textStyle,
  });

  const toggleButtonStyle = (active: boolean) => ({
    flex: 1,
    padding: "10px",
    borderRadius: "10px",
    border: active ? "2px solid #7aa36f" : "1px solid #d8cbbd",
    backgroundColor: active ? "#e7f3e2" : "#fff",
    cursor: "pointer",
    fontSize: "14px",
    ...textStyle,
  });

  const loadSeeds = async () => {
    const currentUserId = localStorage.getItem("logged-in-user-id");

    if (!currentUserId) {
      router.push("/");
      return;
    }

    setLoggedInUserId(currentUserId);

    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("id, name");

    if (!userError && userRows) {
      const nameMap: Record<string, string> = {};

      (userRows as AppUser[]).forEach((user) => {
        nameMap[user.id] = user.name;
      });

      setUserNameMap(nameMap);
    }

    const { data: bouquetRows, error: bouquetError } = await supabase
      .from("bouquet_seeds")
      .select("id, slot_number, title, flower_color, x, y")
      .order("slot_number", { ascending: true });

    if (!bouquetError && bouquetRows) {
      const bouquetIds = bouquetRows.map((seed) => seed.id);

      let bouquetCommentRows: { seed_id: string }[] = [];

      if (bouquetIds.length > 0) {
        const { data: commentData } = await supabase
          .from("seed_comments")
          .select("seed_id")
          .in("seed_id", bouquetIds);

        bouquetCommentRows = (commentData ?? []) as { seed_id: string }[];
      }

      const mergedBouquetSeeds: BouquetSeed[] = bouquetRows.map((seed) => ({
        ...(seed as Omit<BouquetSeed, "commentCount">),
        commentCount: bouquetCommentRows.filter(
          (comment) => comment.seed_id === seed.id,
        ).length,
      }));

      setBouquetSeeds(mergedBouquetSeeds);
    }

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
      comments: commentRows.filter(
        (comment) => comment.worry_seed_id === seed.id,
      ),
    }));

    setWorrySeeds(mergedSeeds);
  };

  useEffect(() => {
    loadSeeds();
  }, []);

  const handleBackgroundClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-seed='true']")) return;

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
        flower_color:
          FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
      })
      .select()
      .single();

    if (error) {
      console.log(error.message);
      return;
    }

    setWorrySeeds((prev) => [
      ...prev,
      { ...(data as WorrySeed), comments: [] },
    ]);

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
          : seed,
      ),
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
          : seed,
      ),
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

    const targetComment = openedSeed.comments.find(
      (comment) => comment.id === commentId,
    );
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
              comments: seed.comments.filter(
                (comment) => comment.id !== commentId,
              ),
            }
          : seed,
      ),
    );
  };

  const renderBouquetBackgroundSeed = (seed: BouquetSeed) => {
    const commentCount = seed.commentCount;
    const color = seed.flower_color || "#f8b4d9";
    const title = seed.title?.trim() || "";

    const seedStage = Math.min(commentCount, 4);
    const stemHeightByStage = [20, 28, 38, 48, 58];
    const stemHeight = stemHeightByStage[seedStage];

    const bloomCommentCount = Math.max(commentCount - 5, 0);
    const growthRatio = Math.min(bloomCommentCount, 80) / 80;

    const flowerSize = 42 + growthRatio * 64;
    const petalWidth = 14 + growthRatio * 18;
    const petalHeight = 22 + growthRatio * 32;
    const petalDistance = 12 + growthRatio * 24;
    const centerSize = 24 + growthRatio * 12;

    if (commentCount < 5) {
      return (
        <div
          style={{
            width: "64px",
            height: "84px",
            position: "relative",
            overflow: "visible",
          }}
        >
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
                width: "18px",
                height: "11px",
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
                width: "19px",
                height: "11px",
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
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "#ffe8a3",
              transform: "translateX(-50%)",
              zIndex: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "3px",
              boxSizing: "border-box",
              color: "#4b3b2f",
              WebkitTextFillColor: "#4b3b2f",
              fontSize: "7px",
              fontWeight: 700,
              lineHeight: 1.05,
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>
      );
    }

    return (
      <div
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
            boxShadow: "0 2px 6px rgba(0,0,0,0.14)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "3px",
            boxSizing: "border-box",
            textAlign: "center",
            overflow: "hidden",
            color: "#4b3b2f",
            WebkitTextFillColor: "#4b3b2f",
            fontSize: `${Math.max(7, centerSize * 0.22)}px`,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
      </div>
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
        <div
          data-seed="true"
          style={{
            width: "70px",
            height: "90px",
            position: "relative",
            overflow: "visible",
          }}
        >
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
        background:
          "radial-gradient(circle at 18% 18%, rgba(248,180,217,0.18), transparent 28%), radial-gradient(circle at 82% 24%, rgba(249,199,79,0.16), transparent 30%), radial-gradient(circle at 50% 82%, rgba(144,190,109,0.14), transparent 34%), #f7f4ef",
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

      <div
        onPointerUp={handleBackgroundClick}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          touchAction: "manipulation",
        }}
      >
        {bouquetSeeds.map((seed, index) => {
          const fallbackX = 14 + (index % 5) * 18;
          const fallbackY = 18 + Math.floor(index / 5) * 13;
          const x = typeof seed.x === "number" ? seed.x : fallbackX;
          const y = typeof seed.y === "number" ? seed.y : fallbackY;

          return (
            <div
              key={`bouquet-bg-${seed.id}`}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%) scale(0.86)",
                opacity: 0.3,
                filter: "blur(0.2px)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              {renderBouquetBackgroundSeed(seed)}
            </div>
          );
        })}

        {worrySeeds.map((seed) => (
          <div
            key={seed.id}
            data-seed="true"
            onPointerUp={(e) => {
              e.stopPropagation();
              setOpenedSeedId(seed.id);
              setIsEditingSeed(false);
            }}
            style={{
              position: "absolute",
              left: `${seed.x}px`,
              top: `${seed.y}px`,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
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
          <div
            style={{
              width: "100%",
              maxWidth: "360px",
              backgroundColor: "#fffaf5",
              borderRadius: "18px",
              padding: "18px",
              ...textStyle,
            }}
          >
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

            <p style={{ fontSize: "13px", margin: "14px 0 6px", ...textStyle }}>
              作成者の表示
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setNewAnonymous(true)}
                style={toggleButtonStyle(newAnonymous)}
              >
                匿名
              </button>

              <button
                type="button"
                onClick={() => setNewAnonymous(false)}
                style={toggleButtonStyle(!newAnonymous)}
              >
                名前を表示
              </button>
            </div>

            <p style={{ fontSize: "13px", margin: "14px 0 6px", ...textStyle }}>
              コメントの公開範囲
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setNewVisibility("owner")}
                style={visibilityButtonStyle(newVisibility === "owner")}
              >
                自分だけ
              </button>

              <button
                type="button"
                onClick={() => setNewVisibility("public")}
                style={visibilityButtonStyle(newVisibility === "public")}
              >
                みんなに公開
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #d8cbbd",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  ...textStyle,
                }}
              >
                閉じる
              </button>

              <button
                onClick={handleCreateSeed}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "#cfe7c8",
                  cursor: "pointer",
                  ...textStyle,
                }}
              >
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

                <p
                  style={{
                    fontSize: "12px",
                    marginTop: "-6px",
                    color: "#7a6a5c",
                    WebkitTextFillColor: "#7a6a5c",
                  }}
                >
                  作成者：{getSeedAuthorName(openedSeed)}
                </p>

                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    ...textStyle,
                  }}
                >
                  {openedSeed.content}
                </p>

                {canEditOpenedSeed && (
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
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

                <p
                  style={{
                    fontSize: "13px",
                    margin: "14px 0 6px",
                    ...textStyle,
                  }}
                >
                  作成者の表示
                </p>

                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setEditAnonymous(true)}
                    style={toggleButtonStyle(editAnonymous)}
                  >
                    匿名
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAnonymous(false)}
                    style={toggleButtonStyle(!editAnonymous)}
                  >
                    名前を表示
                  </button>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    margin: "14px 0 6px",
                    ...textStyle,
                  }}
                >
                  コメントの公開範囲
                </p>

                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setEditVisibility("owner")}
                    style={visibilityButtonStyle(editVisibility === "owner")}
                  >
                    自分だけ
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditVisibility("public")}
                    style={visibilityButtonStyle(editVisibility === "public")}
                  >
                    みんなに公開
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "12px",
                    marginBottom: "12px",
                  }}
                >
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                {openedSeed.comments.map((comment) => {
                  const canDeleteComment =
                    comment.author_id === loggedInUserId ||
                    openedSeed.creator_id === loggedInUserId ||
                    isAdmin;

                  return (
                    <div
                      key={comment.id}
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: "10px",
                        padding: "10px",
                        ...textStyle,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#7a6a5c",
                          WebkitTextFillColor: "#7a6a5c",
                          marginBottom: "4px",
                        }}
                      >
                        {getCommentAuthorName(comment)}
                      </div>

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

            <p style={{ fontSize: "13px", margin: "14px 0 6px", ...textStyle }}>
              コメント投稿者の表示
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setCommentAnonymous(true)}
                style={toggleButtonStyle(commentAnonymous)}
              >
                匿名
              </button>

              <button
                type="button"
                onClick={() => setCommentAnonymous(false)}
                style={toggleButtonStyle(!commentAnonymous)}
              >
                名前を表示
              </button>
            </div>

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
