"use client";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StandingsWithCustomPenalty } from "@/schema";
import { RotateCw, Trophy, Users } from "lucide-react";
import ModeToggle from "../mode-toggle";
import { Skeleton } from "../ui/skeleton";
import { ContestInfo } from "../contest-info";

function StandingsPage() {
  const [refreshTimer, setRefreshTimer] = useState(30);
  const {
    data: standings,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<StandingsWithCustomPenalty>({
    queryKey: ["/api/contest/standings"],
    queryFn: async () => {
      const url = `/api/contest/standings`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch standings");
      return response.json();
    },
    refetchInterval: 30000,
  });
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimer((prev) => {
        if (prev <= 1) {
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (standings) {
      handleLoadContest();
    }
  }, [standings]);

  const handleLoadContest = async () => {
    setRefreshTimer(30);
  };

  const handleManualRefresh = () => {
    refetch();
    handleLoadContest();
  };

  return (
    <>
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
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
                    <button
                      disabled={isRefetching}
                      onClick={handleManualRefresh}
                    >
                      <RotateCw
                        className={`w-4 h-4 text-green-600 dark:text-green-400 cursor-pointer ${
                          isRefetching ? "animate-spin" : ""
                        }`}
                      />
                    </button>
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
    </>
  );
}

export default StandingsPage;
