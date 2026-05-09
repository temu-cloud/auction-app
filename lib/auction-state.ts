import { prisma } from "./prisma";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type TimerStatus = "stopped" | "running" | "paused";

export interface BidRecord {
  id: string;
  bidderName: string;
  amount: number;
  timestamp: number;
}

export interface AuctionState {
  phase: "idle" | "active" | "ended";
  sessionId: string | null;
  item: {
    name: string;
    imageUrl: string | null;
    startingPrice: number;
    hostedBy: string;
  };
  bids: BidRecord[]; // ordered oldest → newest
  highestBid: BidRecord | null;
  sidebarVisible: boolean;
  timer: {
    status: TimerStatus;
    durationSeconds: number;
    remainingSeconds: number;
    startedAt: number | null; // Date.now() when last started/resumed
  };
  winner: BidRecord | null;
}

// ─── Default state factory ────────────────────────────────────────────────────

function createDefaultState(): AuctionState {
  return {
    phase: "idle",
    sessionId: null,
    item: {
      name: "",
      imageUrl: null,
      startingPrice: 0,
      hostedBy: "",
    },
    bids: [],
    highestBid: null,
    sidebarVisible: false,
    timer: {
      status: "stopped",
      durationSeconds: 0,
      remainingSeconds: 0,
      startedAt: null,
    },
    winner: null,
  };
}

// ─── AuctionStateManager ──────────────────────────────────────────────────────

export class AuctionStateManager {
  private state: AuctionState = createDefaultState();

  /**
   * Start a new auction session. Resets all transient state and sets phase to
   * 'active'.
   */
  startSession(
    item: { name: string; imageUrl: string | null; startingPrice: number; hostedBy: string },
    sessionId: string
  ): void {
    this.state = {
      phase: "active",
      sessionId,
      item: { ...item },
      bids: [],
      highestBid: null,
      sidebarVisible: this.state.sidebarVisible,
      timer: {
        status: "stopped",
        durationSeconds: 0,
        remainingSeconds: 0,
        startedAt: null,
      },
      winner: null,
    };
  }

  /**
   * Full reset — clears everything including the item, returning to the
   * true initial state. Used by the "Stop & Reset Display" button so all
   * connected clients return to the first screen.
   */
  fullReset(): void {
    this.state = createDefaultState();
  }

  /**
   * Reset the auction back to idle state after a session has ended.
   *
   * Clears bids, highestBid, winner, and resets the timer to stopped.
   * Preserves sidebarVisible and the current item so the operator can
   * immediately start the next auction with the same (or updated) item.
   * Safe to call in any phase — if already idle, this is effectively a no-op.
   */
  resetSession(): void {
    this.state = {
      ...this.state,
      phase: "idle",
      sessionId: null,
      bids: [],
      highestBid: null,
      winner: null,
      timer: {
        ...this.state.timer,
        status: "stopped",
        remainingSeconds: 0,
        startedAt: null,
      },
    };
  }

  /**
   * End the current auction session. Sets phase to 'ended', records the winner
   * (highest bid), clears sessionId so subsequent item updates don't attempt
   * to write to the now-ended DB record, and returns the winner.
   * Returns null if there were no bids.
   */
  endSession(): BidRecord | null {
    const winner = this.state.highestBid;
    this.state = {
      ...this.state,
      phase: "ended",
      sessionId: null,
      winner,
      timer: {
        ...this.state.timer,
        status: "stopped",
      },
    };
    return winner;
  }

  /**
   * Attempt to add a bid.
   *
   * Rejects when:
   *  - phase !== 'active'
   *  - amount <= current highestBid.amount  (bid monotonicity — Property 1)
   */
  addBid(
    bidderName: string,
    amount: number
  ): { success: boolean; bid?: BidRecord; reason?: string } {
    if (this.state.phase !== "active") {
      return {
        success: false,
        reason: "Auction is not currently active.",
      };
    }

    if (
      this.state.highestBid !== null &&
      amount <= this.state.highestBid.amount
    ) {
      return {
        success: false,
        reason: `Bid must be higher than the current highest bid of ${this.state.highestBid.amount}.`,
      };
    }

    const bid: BidRecord = {
      id: crypto.randomUUID(),
      bidderName,
      amount,
      timestamp: Date.now(),
    };

    this.state = {
      ...this.state,
      bids: [...this.state.bids, bid],
      highestBid: bid,
    };

    return { success: true, bid };
  }

  /**
   * Start (or resume) the countdown timer.
   *
   * When resuming from paused, durationSeconds is the remaining time that was
   * stored before the pause. Callers should pass the current remainingSeconds
   * as the new durationSeconds when resuming.
   */
  startTimer(durationSeconds: number): void {
    this.state = {
      ...this.state,
      timer: {
        status: "running",
        durationSeconds,
        remainingSeconds: durationSeconds,
        startedAt: Date.now(),
      },
    };
  }

  /**
   * Pause the timer. Captures the remaining seconds at the moment of pause so
   * that a subsequent startTimer() call can resume from the right value.
   */
  pauseTimer(): void {
    if (this.state.timer.status !== "running") return;

    const remaining = this.getRemainingSeconds();
    this.state = {
      ...this.state,
      timer: {
        ...this.state.timer,
        status: "paused",
        remainingSeconds: remaining,
        startedAt: null,
      },
    };
  }

  /**
   * Reset the timer back to its initial durationSeconds and stop it.
   */
  resetTimer(): void {
    this.state = {
      ...this.state,
      timer: {
        ...this.state.timer,
        status: "stopped",
        remainingSeconds: this.state.timer.durationSeconds,
        startedAt: null,
      },
    };
  }

  /**
   * Update the current item's name, image URL, starting price, and host in-memory.
   * Callers are responsible for persisting the change to the DB.
   */
  updateItem(item: {
    name: string;
    imageUrl: string | null;
    startingPrice: number;
    hostedBy: string;
  }): void {
    this.state = {
      ...this.state,
      item: { ...item },
    };
  }

  /**
   * Show or hide the item sidebar on all connected display screens.
   */
  toggleSidebar(visible: boolean): void {
    this.state = {
      ...this.state,
      sidebarVisible: visible,
    };
  }

  /**
   * Return a snapshot of the current auction state, with remainingSeconds
   * computed from the startedAt timestamp (not a counter).
   */
  getState(): AuctionState {
    return {
      ...this.state,
      timer: {
        ...this.state.timer,
        remainingSeconds: this.getRemainingSeconds(),
      },
    };
  }

  /**
   * Compute the authoritative remaining seconds from the startedAt timestamp.
   *
   * - When running: duration - elapsed (clamped to 0)
   * - When paused:  the snapshot stored at pause time
   * - When stopped: the stored remainingSeconds (equals durationSeconds after reset)
   */
  getRemainingSeconds(): number {
    const { status, durationSeconds, remainingSeconds, startedAt } =
      this.state.timer;

    if (status === "running" && startedAt !== null) {
      const elapsed = (Date.now() - startedAt) / 1000;
      return Math.max(0, durationSeconds - elapsed);
    }

    return remainingSeconds;
  }

  /**
   * Rehydrate in-memory state from the most recent ACTIVE AuctionSession in
   * the database, including all its bids ordered oldest → newest.
   *
   * Called on server startup so state survives process restarts.
   */
  async rehydrateFromDb(): Promise<void> {
    const session = await prisma.auctionSession.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      include: {
        bids: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      // No active session — leave state as idle default
      return;
    }

    const bids: BidRecord[] = session.bids.map(
      (b: { id: string; bidderName: string; amount: number; createdAt: Date }) => ({
        id: b.id,
        bidderName: b.bidderName,
        amount: b.amount,
        timestamp: b.createdAt.getTime(),
      })
    );

    const highestBid =
      bids.length > 0
        ? bids.reduce((a: BidRecord, b: BidRecord) => (b.amount > a.amount ? b : a))
        : null;

    this.state = {
      phase: "active",
      sessionId: session.id,
      item: {
        name: session.itemName,
        imageUrl: session.itemImageUrl ?? null,
        startingPrice: session.startingPrice,
        hostedBy: (session as { hostedBy?: string }).hostedBy ?? "",
      },
      bids,
      highestBid,
      sidebarVisible: false,
      timer: {
        status: "stopped",
        durationSeconds: 0,
        remainingSeconds: 0,
        startedAt: null,
      },
      winner: null,
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
// Store on globalThis so the same instance is shared across Next.js hot-reloads
// and between route handlers and the socket server in the same process.

const g = globalThis as unknown as { __auctionStateManager?: AuctionStateManager };
if (!g.__auctionStateManager) {
  g.__auctionStateManager = new AuctionStateManager();
}
export const auctionStateManager = g.__auctionStateManager;
