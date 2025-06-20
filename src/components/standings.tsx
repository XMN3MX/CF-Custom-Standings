import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StandingsWithCustomPenalty } from "@/schema";
import { formatTime } from "@/lib/utils";

interface StandingsTableProps {
  standings: StandingsWithCustomPenalty | null;
  isLoading: boolean;
}

export function StandingsTable({ standings, isLoading }: StandingsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Standings</CardTitle>
            <Skeleton className="h-4 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!standings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Select a contest to view standings
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Standings - All Participants</CardTitle>
          <div className="text-sm text-gray-600">
            Penalty = Time + (WA × 5) • WA1 ignored • Fixed penalty: 5 per WA
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-xs font-medium text-gray-700 uppercase tracking-wider">
                <th className="px-4 py-3 text-left border-r border-gray-200 w-16">
                  #
                </th>
                <th className="px-4 py-3 text-left border-r border-gray-200 min-w-48">
                  Participant
                </th>
                <th className="px-4 py-3 text-center border-r border-gray-200 w-20">
                  =
                </th>
                <th className="px-4 py-3 text-center border-r border-gray-200 w-24">
                  Penalty
                </th>
                {standings.problems.map((problem) => (
                  <th
                    key={problem.index}
                    className="px-3 py-3 text-center border-r border-gray-200 w-20 font-bold"
                  >
                    {problem.index}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {standings.rows.map((row) => (
                <tr
                  key={`${row.party.contestId}-${row.party.members[0]?.handle}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-100">
                    {row.rank}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-100">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {row.party.participantType === "CONTESTANT"
                            ? row.party.members[0]?.handle
                            : row.party.teamName ||
                              row.party.members[0]?.handle}
                        </div>
                        {row.party.members[0]?.city && (
                          <div className="text-xs text-gray-500">
                            {row.party.members[0].city}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-semibold border-r border-gray-100">
                    {row.solvedCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-mono border-r border-gray-100">
                    {row.customPenalty}
                  </td>
                  {row.problemResults.map((result, index) => {
                    // Show corrected WA count (excluding presumed WA1) to match penalty calculation
                    const rawWACount = result.rejectedAttemptCount || 0;
                    const actualWACount =
                      rawWACount > 0 ? Math.max(0, rawWACount - 1) : 0;

                    return (
                      <td
                        key={index}
                        className="px-3 py-3 text-center border-r border-gray-100"
                      >
                        {result.points > 0 ? (
                          <div className="bg-green-600 text-white text-xs font-bold py-1 px-2 rounded">
                            <div>
                              {result.bestSubmissionTimeSeconds
                                ? formatTime(result.bestSubmissionTimeSeconds)
                                : "0"}
                            </div>
                            {actualWACount > 0 && (
                              <div className="text-xs opacity-75">
                                {actualWACount}
                              </div>
                            )}
                          </div>
                        ) : actualWACount > 0 ? (
                          <div className="bg-red-600 text-white text-xs font-bold py-1 px-2 rounded">
                            <div>-{actualWACount}</div>
                          </div>
                        ) : (
                          <div className="text-gray-400">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
