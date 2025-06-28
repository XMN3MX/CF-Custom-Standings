"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StandingsWithCustomPenalty } from "@/schema";
import { Trophy, Users } from "lucide-react";
import ModeToggle from "../mode-toggle";
import { Skeleton } from "../ui/skeleton";
import { ContestInfo } from "../contest-info";
import { StandingsTable } from "../standings-table";

// Extended type to include cache info
type StandingsResponse = {
  standings: StandingsWithCustomPenalty; 
  cacheInfo?: {
    remainingTime: number;
    lastUpdated: number;
  };
};

function StandingsPage() {
  const [refreshTimer, setRefreshTimer] = useState(30);

  const {
    data: standingsResponse,
    isLoading,
    isRefetching,
  } = useQuery<StandingsResponse>({
    queryKey: ["/api/contest/standings"],
    queryFn: async () => {
      const url = `/api/contest/standings`;
      const response = await fetch(url, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch standings");
      return response.json();
    },
    refetchInterval: (query) => {
      const data = query?.state?.data as StandingsResponse | undefined;
      const remainingTime = data?.cacheInfo?.remainingTime;
      return remainingTime && remainingTime > 0 ? remainingTime * 1000 : 30000;
    },
    refetchIntervalInBackground: true,
  });

  const standings = standingsResponse?.standings;

  useEffect(() => {
    const remainingTime = standingsResponse?.cacheInfo?.remainingTime;
    if (remainingTime !== undefined) {
      setRefreshTimer(remainingTime > 0 ? remainingTime : 30);
    }
  }, [standingsResponse]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [standingsResponse]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">
              <Trophy className="inline w-6 h-6 text-yellow-500 mr-2" />
              Standings
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {!isLoading ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <span>
                    {isRefetching
                      ? "Refreshing..."
                      : `Next refresh in ${refreshTimer}s`}
                  </span>
                </div>

                {standings && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{standings.rows?.length} participants</span>
                  </div>
                )}
              </>
            ) : (
              <Skeleton className="w-60 h-10" />
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* Contest Info */}
      <ContestInfo contest={standings?.contest} />

      <StandingsTable isLoading={isLoading} standings={standings} />
    </div>
  );
}

export default StandingsPage;
