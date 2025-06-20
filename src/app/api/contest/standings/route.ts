import { codeforcesService } from "@/services/codeforces";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

// Create a cached version of the standings fetch
const getCachedStandings = unstable_cache(
  async () => {
    const standings = await codeforcesService.getContestStandings();
    return {
      data: standings,
      timestamp: Date.now(),
    };
  },
  ["contest-standings"], // cache key
  {
    revalidate: 30, // cache for 30 seconds
    tags: ["standings"],
  }
);

export async function GET() {
  try {
    const cachedResult = await getCachedStandings();
    const currentTime = Date.now();

    // Calculate remaining cache time
    const elapsedSeconds = Math.floor(
      (currentTime - cachedResult.timestamp) / 1000
    );
    const remainingTime = Math.max(0, 30 - elapsedSeconds);

    return NextResponse.json({
      standings: cachedResult.data,
      cacheInfo: {
        remainingTime: remainingTime,
        lastUpdated: cachedResult.timestamp,
      },
    });
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
