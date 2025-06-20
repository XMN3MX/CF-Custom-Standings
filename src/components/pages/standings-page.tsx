"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StandingsWithCustomPenalty } from "@/schema";
import { RotateCw, Trophy, Users } from "lucide-react";
import ModeToggle from "../mode-toggle";
import { Skeleton } from "../ui/skeleton";
import { ContestInfo } from "../contest-info";
import { StandingsTable } from "../standings-table";
import { Button } from "../ui/button";

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
    refetch,
  } = useQuery<StandingsResponse>({
    queryKey: ["/api/contest/standings"],
    queryFn: async () => {
      const url = `/api/contest/standings`;
      const response = await fetch(url, {
        // Disable browser cache to always get server response
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch standings");
      return response.json();
    },
  });

  // Extract standings data (without cache info)
  const standings = standingsResponse?.standings;

  // Update refresh timer when new data arrives
  useEffect(() => {
    if (standingsResponse?.cacheInfo?.remainingTime !== undefined) {
      setRefreshTimer(standingsResponse.cacheInfo.remainingTime);
    }
  }, [standingsResponse?.cacheInfo?.remainingTime]);

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimer((prev) => {
        if (prev <= 1) {
          refetch();
          return 30; // Reset to 30 when it reaches 0
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleManualRefresh = () => {
    refetch();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">
                <Trophy className="inline w-6 h-6 text-yellow-500 mr-2" />
                CF Gym Custom Standings
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {!isLoading ? (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <Button
                      disabled={isRefetching}
                      variant="ghost"
                      size="icon"
                      onClick={handleManualRefresh}
                    >
                      <RotateCw
                        className={`w-4 h-4 text-[var(--solved)] cursor-pointer ${
                          isRefetching ? "animate-spin" : ""
                        }`}
                      />
                    </Button>
                    <span>Next refresh in {refreshTimer}s</span>
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
        </div>
      </header>

      {/* Contest Info */}
      <ContestInfo contest={standings?.contest} />

      <StandingsTable isLoading={isLoading} standings={standings} />
    </div>
  );
}

export default StandingsPage;
