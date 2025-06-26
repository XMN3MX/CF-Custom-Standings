import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HourglassIcon } from "lucide-react";
import { Contest } from "@/schema";
import { formatDuration, getContestStatusAndTime } from "@/lib/utils";
import Image from "next/image";

interface ContestInfoProps {
  contest?: Contest;
}

export function ContestInfo({ contest }: ContestInfoProps) {
  if (!contest) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex-1">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Logo" width={25} height={25} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {contest.name}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {contest.type} - Contest • Duration:{" "}
              {formatDuration(contest.durationSeconds)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <HourglassIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {getContestStatusAndTime(
                  contest.startTimeSeconds,
                  contest.durationSeconds
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
