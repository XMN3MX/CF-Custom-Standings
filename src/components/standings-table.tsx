import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StandingsWithCustomPenalty } from "@/schema";
import { formatTime } from "@/lib/utils";

interface StandingsTableProps {
  standings?: StandingsWithCustomPenalty | null;
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
          <div className="text-center py-8 text-muted-foreground">
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
          <div className="text-sm text-muted-foreground">
            Penalty = Time + (WA × 5) • WA1 ignored • Fixed penalty: 5 per WA
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-solved rounded"></div>
            <span>Solved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-first-solver rounded"></div>
            <span>First Solver</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-wrong-attempt rounded"></div>
            <span>Wrong Attempts</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left border-r border-border w-16">
                  #
                </th>
                <th className="px-4 py-3 text-left border-r border-border min-w-48">
                  Participant
                </th>
                <th className="px-4 py-3 text-center border-r border-border w-20">
                  =
                </th>
                <th className="px-4 py-3 text-center border-r border-border w-24">
                  Penalty
                </th>
                {standings.problems.map((problem) => (
                  <th
                    key={problem.index}
                    className="px-3 py-3 text-center border-r border-border w-20 font-bold"
                  >
                    {problem.index}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {standings.rows.map((row, rowIndex) => (
                <tr
                  key={`${row.party.contestId}-${row.party.members[0]?.handle}`}
                  className={`transition-colors ${
                    rowIndex % 2 === 0
                      ? "bg-card hover:bg-accent"
                      : "bg-muted hover:bg-accent"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-card-foreground border-r border-border">
                    {row.rank}
                  </td>
                  <td className="px-4 py-3 border-r border-border">
                    <div className="flex items-center">
                      <div className="ml-3">
                        <div className="text-sm font-medium text-card-foreground">
                          {row.party.participantType === "CONTESTANT"
                            ? row.party.members[0]?.handle
                            : row.party.teamName ||
                              row.party.members[0]?.handle}
                        </div>
                        {row.party.members[0]?.city && (
                          <div className="text-xs text-muted-foreground">
                            {row.party.members[0].city}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-semibold border-r border-border">
                    {row.solvedCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-mono border-r border-border">
                    {row.customPenalty}
                  </td>
                  {row.problemResults.map((result, index) => {
                    // Show corrected WA count (excluding presumed WA1) to match penalty calculation
                    const rawWACount = result.rejectedAttemptCount || 0;
                    const actualWACount =
                      rawWACount > 0 ? Math.max(0, rawWACount - 1) : 0;

                    // Check if this participant is the first solver for this problem
                    const problemIndex = standings.problems[index].index;
                    const participantHandle =
                      row.party.participantType === "CONTESTANT"
                        ? row.party.members[0]?.handle
                        : row.party.teamName || row.party.members[0]?.handle;
                    const isFirstSolver =
                      standings.firstSolvers?.[problemIndex] ===
                      participantHandle;

                    return (
                      <td
                        key={index}
                        className="px-3 py-3 text-center border-r border-border"
                      >
                        {result.points > 0 ? (
                          <div
                            className={`text-solved-foreground text-xs font-bold py-1 px-2 rounded ${
                              isFirstSolver
                                ? "bg-first-solver text-first-solver-foreground"
                                : "bg-solved"
                            }`}
                          >
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
                          <div className="bg-wrong-attempt text-wrong-attempt-foreground text-xs font-bold py-1 px-2 rounded">
                            <div>-{actualWACount}</div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">-</div>
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
