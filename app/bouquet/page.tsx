"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  x: number | null;
  y: number | null;
  created_at: string;
  owner?: JoinedOwner;
  comments: SeedComment[];
};

type BackgroundWorryComment = {
  id: string;
  worry_seed_id: string;
};

type BackgroundWorrySeed = {
  id: string;
  x: number;
  y: number;
  title: string;
  flower_color: string | null;
  comments: BackgroundWorryComment[];
};

type LaunchDrag = {
  seedId: string;
  pointerId: number;
  start: { x: number; y: number };
  current: { x: number; y: number };
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
    clipPath:
      "polygon(50% 0%, 100% 24%, 72% 50%, 100% 76%, 50% 100%, 0% 76%, 28% 50%, 0% 24%)",
    widthScale: 1.36,
    heightScale: 0.88,
    rotateOffset: 0,
  },
  {
    value: "heart",
    label: "ハート",
    borderRadius: "70% 70% 45% 45%",
    clipPath:
      "polygon(50% 100%, 10% 58%, 8% 28%, 30% 8%, 50% 28%, 70% 8%, 92% 28%, 90% 58%)",
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
    clipPath:
      "polygon(50% 0%, 62% 34%, 98% 35%, 69% 56%, 79% 92%, 50% 70%, 21% 92%, 31% 56%, 2% 35%, 38% 34%)",
    widthScale: 1.28,
    heightScale: 1.28,
    rotateOffset: 18,
  },
];

const DEFAULT_FLOWER_SHAPE = FLOWER_SHAPES[0].value;

const getFlowerShapeConfig = (shape: string | null | undefined) => {
  return FLOWER_SHAPES.find((item) => item.value === shape) ?? FLOWER_SHAPES[0];
};

const SLOT_NUMBERS = Array.from({ length: 41 }, (_, i) => 5260 + i).filter(
  (num) => num !== 5285,
);

const EDGE_MARGIN = 8;
const MIN_FLOWER_DISTANCE = 7;
const REPULSION_ITERATIONS = 3;
const LAUNCH_POWER = 0.22;
const LAUNCH_FRICTION = 0.94;
const LAUNCH_BOUNCE = 0.35;
const LAUNCH_STOP_SPEED = 0.08;
const MAX_PULL_DISTANCE = 20;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getDefaultPosition = (slotNumber: number) => {
  const index = Math.max(0, SLOT_NUMBERS.indexOf(slotNumber));
  const columns = 5;
  const rows = Math.ceil(SLOT_NUMBERS.length / columns);
  const col = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: ((col + 0.5) / columns) * 100,
    y: ((row + 0.5) / rows) * 100,
  };
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const getStableRandom = (key: string) => {
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return (Math.sin(hash) + 1) / 2;
};

export default function BouquetPage() {
  const supabase = createClient();
  const router = useRouter();

  const gardenRef = useRef<HTMLDivElement | null>(null);
  const draggingSeedIdRef = useRef<string | null>(null);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartedRef = useRef(false);
  const launchDragRef = useRef<LaunchDrag | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<BouquetSeed[]>([]);
  const [backgroundWorrySeeds, setBackgroundWorrySeeds] = useState<
    BackgroundWorrySeed[]
  >([]);
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
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [launchDrag, setLaunchDrag] = useState<LaunchDrag | null>(null);

  const isAdmin = loggedInUserId === ADMIN_ID;

  const openedSeed = useMemo(() => {
    if (openedSlotNumber === null) return null;
    return seeds.find((seed) => seed.slot_number === openedSlotNumber) ?? null;
  }, [openedSlotNumber, seeds]);

  const isOwner = Boolean(openedSeed && loggedInUserId === openedSeed.owner_id);

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

  const getSeedPosition = (seed: BouquetSeed) => {
    const fallback = getDefaultPosition(seed.slot_number);

    return {
      x: typeof seed.x === "number" ? seed.x : fallback.x,
      y: typeof seed.y === "number" ? seed.y : fallback.y,
    };
  };

  const canMoveSeed = (seed: BouquetSeed) => {
    return Boolean(
      loggedInUserId && (seed.owner_id === loggedInUserId || isAdmin),
    );
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

    const growthRatio = 0;

    // 댓글 0~4개까지는 씨앗/새싹 단계, 5개부터 꽃이 피는 단계입니다.
    const seedStage = Math.min(commentCount, 4);
    const stemHeightByStage = [28, 36, 48, 56, 64];
    const stemHeight = stemHeightByStage[seedStage];
    const sproutSize = 30;
    const seedContainerHeight = 88;
    const seedContainerWidth = 70;

    // NOTE:
    // 꽃 전체가 위쪽 꼭짓점 기준으로 커지는 느낌이 나지 않도록
    // 모든 꽃잎/중앙 원을 같은 중심점(left:50%, top:50%) 기준으로 배치합니다.
    const size = 42 + growthRatio * 84;
    const basePetalWidth = 14 + growthRatio * 24;
    const basePetalHeight = 22 + growthRatio * 42;
    const petalWidth = basePetalWidth * shapeConfig.widthScale;
    const petalHeight = basePetalHeight * shapeConfig.heightScale;
    const petalDistance = 12 + growthRatio * 30;
    const centerSize = 22 + growthRatio * 16;
    const petalCount = 6;

    if (commentCount < 5) {
      return (
        <div
          style={{
            width: `${seedContainerWidth}px`,
            height: `${seedContainerHeight}px`,
            position: "relative",
            overflow: "visible",
            isolation: "isolate",
          }}
        >
          {/* 줄기: 댓글 1개부터 조금씩 길어집니다 */}
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

          {/* 댓글 3개부터 잎 1개 */}
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
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            />
          )}

          {/* 댓글 4개부터 잎 2개 */}
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
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            />
          )}

          {/* 씨앗/새싹 머리: 댓글 수에 따라 조금 위로 올라갑니다 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: `${stemHeight + 2}px`,
              width: `${sproutSize}px`,
              height: `${sproutSize}px`,
              borderRadius: "50% 50% 46% 46%",
              backgroundColor: "#ffe8a3",
              transform: "translateX(-50%)",
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
  const renderBackgroundWorrySeed = (seed: BackgroundWorrySeed) => {
    const commentCount = seed.comments.length;
    const color = seed.flower_color || "#f8b4d9";

    const seedStage = Math.min(commentCount, 4);
    const stemHeightByStage = [16, 22, 30, 38, 46];
    const stemHeight = stemHeightByStage[seedStage];

    const bloomCommentCount = Math.max(commentCount - 5, 0);
    const growthRatio = Math.min(bloomCommentCount, 80) / 80;

    const flowerSize = 34 + growthRatio * 64;
    const petalWidth = 12 + growthRatio * 18;
    const petalHeight = 18 + growthRatio * 34;
    const petalDistance = 10 + growthRatio * 26;
    const centerSize = 22 + growthRatio * 12;

    if (commentCount < 5) {
      return (
        <div
          style={{
            width: "56px",
            height: "72px",
            position: "relative",
            overflow: "visible",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "6px",
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
                bottom: `${stemHeight * 0.42 + 6}px`,
                width: "16px",
                height: "10px",
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
                bottom: `${stemHeight * 0.62 + 6}px`,
                width: "18px",
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
              bottom: `${stemHeight}px`,
              width: "26px",
              height: "26px",
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
              padding: "2px",
              boxSizing: "border-box",
              color: "#4b3b2f",
              WebkitTextFillColor: "#4b3b2f",
              opacity: 1,
              fontSize: "7px",
              fontWeight: 700,
              lineHeight: 1.05,
              overflow: "hidden",
              wordBreak: "keep-all",
            }}
          >
            {seed.title}
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
            padding: "2px",
            boxSizing: "border-box",
            textAlign: "center",
            overflow: "hidden",
            color: "#4b3b2f",
            WebkitTextFillColor: "#4b3b2f",
            opacity: 1,
            fontSize: `${Math.max(7, centerSize * 0.22)}px`,
            fontWeight: 700,
            lineHeight: 1.05,
            wordBreak: "keep-all",
          }}
        >
          {seed.title}
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
        "id, owner_id, slot_number, title, flower_color, flower_shape, x, y, created_at, owner:users!bouquet_seeds_owner_id_fkey(name)",
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
          "id, seed_id, author_id, content, is_anonymous, created_at, author:users!seed_comments_author_id_fkey(name)",
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
      }),
    );

    setSeeds(mergedSeeds);

    const { data: worryRows, error: worryError } = await supabase
      .from("worry_seeds")
      .select("id, x, y, title, flower_color")
      .order("created_at", { ascending: true });

    if (!worryError) {
      const worryIds = (worryRows ?? []).map((seed) => seed.id);

      let worryCommentRows: BackgroundWorryComment[] = [];

      if (worryIds.length > 0) {
        const { data: worryComments } = await supabase
          .from("worry_comments")
          .select("id, worry_seed_id")
          .in("worry_seed_id", worryIds);

        worryCommentRows = (worryComments ?? []) as BackgroundWorryComment[];
      }

      const mergedWorrySeeds: BackgroundWorrySeed[] = (
        (worryRows ?? []) as Omit<BackgroundWorrySeed, "comments">[]
      ).map((seed) => ({
        ...seed,
        comments: worryCommentRows.filter(
          (comment) => comment.worry_seed_id === seed.id,
        ),
      }));

      setBackgroundWorrySeeds(mergedWorrySeeds);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSeeds();
  }, []);

  const handleSlotClick = (slotNumber: number) => {
    if (isMoveMode || dragStartedRef.current || launchDragRef.current) return;

    const seed = seeds.find((item) => item.slot_number === slotNumber);
    if (!seed) return;

    setOpenedSlotNumber(slotNumber);
    setCommentText("");
    setIsAnonymous(true);
    setEditTitle(seed.title || "");
    setEditColor(seed.flower_color || FLOWER_COLORS[0]);
    setEditShape(seed.flower_shape || DEFAULT_FLOWER_SHAPE);
  };

  const getPositionFromPointer = (clientX: number, clientY: number) => {
    const garden = gardenRef.current;
    if (!garden) return null;

    const rect = garden.getBoundingClientRect();

    return {
      x: clamp(
        ((clientX - rect.left) / rect.width) * 100,
        EDGE_MARGIN,
        100 - EDGE_MARGIN,
      ),
      y: clamp(
        ((clientY - rect.top) / rect.height) * 100,
        EDGE_MARGIN,
        100 - EDGE_MARGIN,
      ),
    };
  };

  const resolveFlowerPositions = (
    movingSeedId: string,
    movingPosition: { x: number; y: number },
  ) => {
    const positions = seeds.map((seed) => ({
      id: seed.id,
      x: seed.id === movingSeedId ? movingPosition.x : getSeedPosition(seed).x,
      y: seed.id === movingSeedId ? movingPosition.y : getSeedPosition(seed).y,
    }));

    for (let loop = 0; loop < REPULSION_ITERATIONS; loop++) {
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

          if (distance < MIN_FLOWER_DISTANCE) {
            const push = (MIN_FLOWER_DISTANCE - distance) / 2;
            const nx = dx / distance;
            const ny = dy / distance;

            a.x = clamp(a.x - nx * push, EDGE_MARGIN, 100 - EDGE_MARGIN);
            a.y = clamp(a.y - ny * push, EDGE_MARGIN, 100 - EDGE_MARGIN);
            b.x = clamp(b.x + nx * push, EDGE_MARGIN, 100 - EDGE_MARGIN);
            b.y = clamp(b.y + ny * push, EDGE_MARGIN, 100 - EDGE_MARGIN);
          }
        }
      }
    }

    return positions;
  };

  const updateSeedPositionsLocal = (
    positions: { id: string; x: number; y: number }[],
  ) => {
    setSeeds((prev) =>
      prev.map((seed) => {
        const found = positions.find((pos) => pos.id === seed.id);
        return found ? { ...seed, x: found.x, y: found.y } : seed;
      }),
    );
  };

  const getLimitedPullPosition = (
    start: { x: number; y: number },
    current: { x: number; y: number },
  ) => {
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= MAX_PULL_DISTANCE) return current;

    const ratio = MAX_PULL_DISTANCE / distance;
    return {
      x: start.x + dx * ratio,
      y: start.y + dy * ratio,
    };
  };

  const saveSeedPositions = async (
    positions: { id: string; x: number; y: number }[],
  ) => {
    const results = await Promise.all(
      positions.map((pos) =>
        supabase
          .from("bouquet_seeds")
          .update({
            x: pos.x,
            y: pos.y,
          })
          .eq("id", pos.id),
      ),
    );

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      setMessage(failed.error.message);
      loadSeeds();
    }
  };

  const animateLaunch = (
    seedId: string,
    startPosition: { x: number; y: number },
    velocity: { x: number; y: number },
  ) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    let position = { ...startPosition };
    let speed = { ...velocity };
    let latestPositions = resolveFlowerPositions(seedId, position);

    const step = () => {
      position = {
        x: position.x + speed.x,
        y: position.y + speed.y,
      };

      if (position.x <= EDGE_MARGIN || position.x >= 100 - EDGE_MARGIN) {
        speed.x *= -LAUNCH_BOUNCE;
        position.x = clamp(position.x, EDGE_MARGIN, 100 - EDGE_MARGIN);
      }

      if (position.y <= EDGE_MARGIN || position.y >= 100 - EDGE_MARGIN) {
        speed.y *= -LAUNCH_BOUNCE;
        position.y = clamp(position.y, EDGE_MARGIN, 100 - EDGE_MARGIN);
      }

      speed.x *= LAUNCH_FRICTION;
      speed.y *= LAUNCH_FRICTION;

      latestPositions = resolveFlowerPositions(seedId, position);
      updateSeedPositionsLocal(latestPositions);

      const currentSpeed = Math.sqrt(speed.x * speed.x + speed.y * speed.y);

      if (currentSpeed > LAUNCH_STOP_SPEED) {
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
      saveSeedPositions(latestPositions);

      setTimeout(() => {
        dragStartedRef.current = false;
      }, 100);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  };

  const handleMoveStart = (
    e: React.PointerEvent<HTMLDivElement>,
    seed: BouquetSeed,
  ) => {
    if (!isMoveMode) return;
    if (!canMoveSeed(seed)) return;

    e.preventDefault();
    e.stopPropagation();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startPosition = getSeedPosition(seed);

    draggingSeedIdRef.current = seed.id;
    dragStartedRef.current = true;
    dragPositionRef.current = startPosition;

    e.currentTarget.setPointerCapture(e.pointerId);

    const nextDrag = {
      seedId: seed.id,
      pointerId: e.pointerId,
      start: startPosition,
      current: startPosition,
    };

    launchDragRef.current = nextDrag;
    setLaunchDrag(nextDrag);
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const currentDrag = launchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== e.pointerId) return;

    e.preventDefault();

    const pointerPosition = getPositionFromPointer(e.clientX, e.clientY);
    if (!pointerPosition) return;

    const pullPosition = getLimitedPullPosition(
      currentDrag.start,
      pointerPosition,
    );

    const nextDrag = { ...currentDrag, current: pullPosition };

    launchDragRef.current = nextDrag;
    dragPositionRef.current = pullPosition;
    setLaunchDrag(nextDrag);

    updateSeedPositionsLocal(
      resolveFlowerPositions(currentDrag.seedId, pullPosition),
    );
  };

  const handleMoveEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const currentDrag = launchDragRef.current;
    if (!currentDrag || currentDrag.pointerId !== e.pointerId) return;

    e.preventDefault();

    const pullPosition = currentDrag.current;
    const velocity = {
      x: (currentDrag.start.x - pullPosition.x) * LAUNCH_POWER,
      y: (currentDrag.start.y - pullPosition.y) * LAUNCH_POWER,
    };

    draggingSeedIdRef.current = null;
    dragPositionRef.current = null;
    launchDragRef.current = null;
    setLaunchDrag(null);

    const pullDistance = Math.sqrt(
      (currentDrag.start.x - pullPosition.x) ** 2 +
        (currentDrag.start.y - pullPosition.y) ** 2,
    );

    if (pullDistance < 1) {
      saveSeedPositions(
        resolveFlowerPositions(currentDrag.seedId, pullPosition),
      );
      setTimeout(() => {
        dragStartedRef.current = false;
      }, 100);
      return;
    }

    animateLaunch(currentDrag.seedId, pullPosition, velocity);
  };

  const renderLaunchArrow = () => {
    if (!launchDrag) return null;

    const dx = launchDrag.start.x - launchDrag.current.x;
    const dy = launchDrag.start.y - launchDrag.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return null;

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const arrowLength = clamp(distance * 1.8, 8, 28);

    return (
      <div
        style={{
          position: "absolute",
          left: `${launchDrag.current.x}%`,
          top: `${launchDrag.current.y}%`,
          width: `${arrowLength}%`,
          height: "0px",
          transform: `rotate(${angle}deg)`,
          transformOrigin: "0 50%",
          borderTop: "4px solid rgba(122, 93, 70, 0.78)",
          filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.16))",
          pointerEvents: "none",
          zIndex: 900,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-2px",
            top: "-9px",
            width: 0,
            height: 0,
            borderTop: "7px solid transparent",
            borderBottom: "7px solid transparent",
            borderLeft: "12px solid rgba(122, 93, 70, 0.78)",
          }}
        />
      </div>
    );
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
          ? {
              ...seed,
              title: editTitle,
              flower_color: editColor,
              flower_shape: editShape,
            }
          : seed,
      ),
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
        "id, seed_id, author_id, content, is_anonymous, created_at, author:users!seed_comments_author_id_fkey(name)",
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
          : seed,
      ),
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
      })),
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
        position: "relative",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          opacity: 0.42,
        }}
      >
        {backgroundWorrySeeds.map((seed) => (
          <div
            key={seed.id}
            style={{
              position: "absolute",
              left: `${seed.x}px`,
              top: `${seed.y}px`,
              transform: "translate(-50%, -50%) scale(0.78)",
              transformOrigin: "center center",
            }}
          >
            {renderBackgroundWorrySeed(seed)}
          </div>
        ))}
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "12px",
          position: "relative",
          zIndex: 20,
        }}
      >
        <button
          onClick={() => router.push("/bouquet/background")}
          style={{
            fontSize: "28px",
            margin: 0,
            lineHeight: 1.2,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            color: "#2f2a25",
            WebkitTextFillColor: "#2f2a25",
            opacity: 1,
            fontWeight: 700,
            position: "relative",
            zIndex: 999,
            pointerEvents: "auto",
          }}
        >
          🌸 花束
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #d8cbbd",
            backgroundColor: "#fff",
            color: "#2f2a25",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          戻る
        </button>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          marginBottom: "12px",
          position: "relative",
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setIsMoveMode((prev) => !prev)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "12px",
            border: isMoveMode ? "2px solid #7a6b5d" : "1px solid #d8cbbd",
            backgroundColor: isMoveMode ? "#fff1c7" : "#fff",
            color: "#2f2a25",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isMoveMode
            ? "発射モード中：花を引っぱれます"
            : "自分の花の位置を変更する"}
        </button>

        {isMoveMode && (
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "12px",
              color: "#7a6b5d",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            自分の花を後ろに引っぱって離してください。矢印の方向に飛びます。花同士は少し重なります。
          </p>
        )}
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
            position: "relative",
            zIndex: 20,
          }}
        >
          {message}
        </p>
      )}

      <div
        ref={gardenRef}
        style={{
          width: "100%",
          maxWidth: "420px",
          height: "640px",
          borderRadius: "34px",
          border: "10px solid #e8b7c2",
          outline: "2px dashed rgba(122, 93, 70, 0.28)",
          outlineOffset: "-16px",
          background:
            "radial-gradient(circle at 50% 18%, rgba(255,255,255,0.92) 0%, rgba(255,250,245,0.78) 42%, rgba(255,238,230,0.76) 100%)",
          boxShadow:
            "0 14px 30px rgba(89, 64, 48, 0.15), inset 0 0 0 3px rgba(255,255,255,0.78)",
          position: "relative",
          zIndex: 20,
          overflow: "visible",
          // 위치 변경 모드에서도 빈 공간을 위아래로 드래그하면 페이지 스크롤이 됩니다.
          // 실제 꽃을 잡았을 때만 각 꽃 요소에서 touchAction: none 으로 발사 조작을 막습니다.
          touchAction: isMoveMode ? "pan-y" : "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "-23px",
            width: "92px",
            height: "36px",
            transform: "translateX(-50%)",
            borderRadius: "999px 999px 12px 12px",
            background:
              "linear-gradient(135deg, #f8d7df 0%, #e8b7c2 50%, #f8d7df 100%)",
            boxShadow: "0 4px 10px rgba(89, 64, 48, 0.14)",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "-21px",
            width: "72px",
            height: "26px",
            transform: "translateX(-50%)",
            clipPath: "polygon(0 0, 100% 0, 86% 100%, 50% 58%, 14% 100%)",
            backgroundColor: "#d79aaa",
            boxShadow: "0 4px 10px rgba(89, 64, 48, 0.14)",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "-4px",
            width: "86%",
            height: "210px",
            transform: "translateX(-50%)",
            clipPath: "polygon(9% 100%, 91% 100%, 73% 14%, 50% 0%, 27% 14%)",
            background:
              "linear-gradient(135deg, rgba(255,239,224,0.88), rgba(255,250,245,0.5) 48%, rgba(240,213,198,0.84))",
            border: "1px solid rgba(172, 126, 95, 0.24)",
            boxShadow: "0 -4px 18px rgba(89, 64, 48, 0.08)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        {/* 花束の後ろに見える布・包装紙のレイヤー */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "74px",
            width: "78%",
            height: "380px",
            transform: "translateX(-50%) rotate(-8deg)",
            clipPath: "polygon(50% 0%, 96% 18%, 82% 100%, 14% 100%, 4% 18%)",
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.72), rgba(255,232,214,0.44) 48%, rgba(233,193,176,0.64))",
            border: "1px solid rgba(173, 125, 95, 0.2)",
            boxShadow: "0 14px 26px rgba(89,64,48,0.08)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "35%",
            bottom: "86px",
            width: "44%",
            height: "350px",
            transform: "translateX(-50%) rotate(13deg)",
            clipPath: "polygon(46% 0%, 100% 24%, 78% 100%, 0 92%, 12% 18%)",
            background:
              "linear-gradient(135deg, rgba(255,250,244,0.58), rgba(246,213,195,0.5) 55%, rgba(255,255,255,0.36))",
            border: "1px solid rgba(173, 125, 95, 0.16)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "10%",
            bottom: "92px",
            width: "38%",
            height: "330px",
            transform: "rotate(-12deg)",
            clipPath: "polygon(54% 0%, 92% 16%, 100% 92%, 18% 100%, 0 24%)",
            background:
              "linear-gradient(145deg, rgba(255,246,236,0.52), rgba(238,204,190,0.44) 55%, rgba(255,255,255,0.3))",
            border: "1px solid rgba(173, 125, 95, 0.14)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "94px",
            width: "2px",
            height: "320px",
            transform: "translateX(-50%) rotate(2deg)",
            background:
              "linear-gradient(180deg, transparent, rgba(154,103,78,0.16), transparent)",
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 4,
            overflow: "visible",
          }}
        >
          {seeds.map((seed) => {
            const position = getSeedPosition(seed);
            const stemStartX = 50 + (position.x - 50) * 0.08;
            const stemStartY = 92;
            const stemEndX = position.x;
            const stemEndY = position.y;
            return (
              <g key={`stem-${seed.id}`}>
                <line
                  x1={stemStartX}
                  y1={stemStartY}
                  x2={stemEndX}
                  y2={stemEndY}
                  stroke="rgba(77, 124, 68, 0.48)"
                  strokeWidth="0.72"
                  strokeLinecap="round"
                />
                <line
                  x1={stemStartX}
                  y1={stemStartY}
                  x2={stemEndX}
                  y2={stemEndY}
                  stroke="rgba(255, 255, 255, 0.22)"
                  strokeWidth="0.22"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "14px",
            width: "92%",
            maxWidth: "520px",
            height: "116px",
            transform: "translateX(-50%) rotate(-1deg)",
            pointerEvents: "none",
            zIndex: 70,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "28px",
              width: "100%",
              height: "46px",
              transform: "translateX(-50%)",
              borderRadius: "999px",
              background:
                "linear-gradient(135deg, #fff2a8 0%, #ffd84d 38%, #f5b82e 100%)",
              border: "2px solid rgba(178, 129, 27, 0.28)",
              boxShadow:
                "inset 0 2px 4px rgba(255,255,255,0.55), 0 7px 16px rgba(89, 64, 48, 0.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "51px",
              width: "116px",
              height: "58px",
              borderRadius: "54% 12px 54% 12px",
              background:
                "linear-gradient(135deg, #ffe779 0%, #f7c63a 60%, #d99b1e 100%)",
              transform: "translate(-96%, -50%) rotate(-24deg)",
              boxShadow: "0 6px 12px rgba(89, 64, 48, 0.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "51px",
              width: "116px",
              height: "58px",
              borderRadius: "12px 54% 12px 54%",
              background:
                "linear-gradient(135deg, #fff0a0 0%, #f7c63a 60%, #d99b1e 100%)",
              transform: "translate(-4%, -50%) rotate(24deg)",
              boxShadow: "0 6px 12px rgba(89, 64, 48, 0.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "51px",
              width: "78px",
              height: "52px",
              borderRadius: "999px",
              background:
                "linear-gradient(135deg, #fff3a6 0%, #f4be2b 65%, #d69615 100%)",
              transform: "translate(-50%, -50%)",
              boxShadow:
                "inset 0 2px 5px rgba(255,255,255,0.55), 0 5px 10px rgba(89,64,48,0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "15px",
              width: "86%",
              transform: "translateX(-50%)",
              color: "#76521b",
              fontSize: "clamp(9px, 2.2vw, 13px)",
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: "0.03em",
              textAlign: "center",
              textShadow: "0 1px 0 rgba(255,255,255,0.72)",
              whiteSpace: "normal",
            }}
          >
            新芽のような素直さをもって、はなとなり、
            <br />
            笑顔溢れる世界を創り出す
          </div>
          <div
            style={{
              position: "absolute",
              left: "92px",
              top: "70px",
              width: "54px",
              height: "42px",
              clipPath: "polygon(0 0, 100% 0, 82% 100%, 50% 72%, 16% 100%)",
              background: "linear-gradient(180deg, #f3bd31 0%, #d99615 100%)",
              transform: "rotate(9deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "92px",
              top: "70px",
              width: "54px",
              height: "42px",
              clipPath: "polygon(0 0, 100% 0, 84% 100%, 50% 72%, 18% 100%)",
              background: "linear-gradient(180deg, #f3bd31 0%, #d99615 100%)",
              transform: "rotate(-9deg)",
            }}
          />
        </div>
        {renderLaunchArrow()}
        {seeds.map((seed) => {
          const position = getSeedPosition(seed);
          const movable = canMoveSeed(seed);
          const commentCount = seed.comments.length;

          return (
            <div
              key={seed.id}
              onClick={() => handleSlotClick(seed.slot_number)}
              onPointerDown={(e) => handleMoveStart(e, seed)}
              onPointerMove={handleMove}
              onPointerUp={handleMoveEnd}
              onPointerCancel={handleMoveEnd}
              style={{
                position: "absolute",
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: isMoveMode && movable ? "grab" : "pointer",
                opacity: isMoveMode && !movable ? 0.35 : 1,
                zIndex:
                  isMoveMode && movable
                    ? 500
                    : 200 - Math.min(commentCount, 100),
                touchAction: isMoveMode ? "none" : "auto",
                userSelect: "none",
              }}
            >
              {renderFlower(seed)}
            </div>
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
                color: openedSeed.title?.trim() ? "#333" : "#aaa",
                fontWeight: openedSeed.title?.trim() ? "600" : "400",
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
                    backgroundColor: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(4px)",
                    color: "#333",
                    WebkitAppearance: "none",
                    appearance: "none",
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
                    backgroundColor: savingSeed ? "#d8b5c5" : "#e7c8d8",
                    color: "#333",
                    fontWeight: "600",
                    cursor: savingSeed ? "not-allowed" : "pointer",
                    opacity: savingSeed ? 0.8 : 1,
                    transition: "all 0.2s ease",
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
                color: "#333",
                opacity: 1,
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
                        color: "#333333",
                        opacity: 1,
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
            ) : null}

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
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(4px)",
                color: "#333",
                WebkitAppearance: "none",
                appearance: "none",
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
                  color: "#333",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
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
                  backgroundColor: sendingComment ? "#b9d8b1" : "#cfe7c8",
                  color: "#2f4f2f",
                  fontWeight: "600",
                  cursor: sendingComment ? "not-allowed" : "pointer",
                  opacity: sendingComment ? 0.8 : 1,
                  transition: "all 0.2s ease",
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
