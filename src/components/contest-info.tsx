import { Card, CardContent } from "@/components/ui/card";
import { Clock, HourglassIcon } from "lucide-react";
import { Contest } from "@/schema";
import {
  formatDuration,
  getTimeAgo,
  getContestPhaseDisplay,
} from "@/lib/utils";

interface ContestInfoProps {
  contest: Contest;
}

export function ContestInfo({ contest }: ContestInfoProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {contest.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {contest.type} - Contest • Duration:{" "}
              {formatDuration(contest.durationSeconds)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {getTimeAgo(contest.startTimeSeconds)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <HourglassIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {getContestPhaseDisplay(contest.phase)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
