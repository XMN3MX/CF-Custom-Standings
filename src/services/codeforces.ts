import {
  Standings,
  StandingsWithCustomPenalty,
  StandingsRowWithCustomPenalty,
  ProblemResult,
  Submission,
  Problem,
} from "@/schema";
import { createHash } from "crypto";

export class CodeforcesService {
  private baseUrl = "https://codeforces.com/api";
  private apiKey: string | undefined;
  private apiSecret: string | undefined;
  private groupId: string | undefined;
  private contestId: number;

  constructor() {
    this.apiKey = process.env.API_KEY;
    this.apiSecret = process.env.API_SECRET;
    this.groupId = process.env.GROUP_ID;
    this.contestId = Number(process.env.CONTEST_ID);
  }

  async getContestStandings(): Promise<StandingsWithCustomPenalty> {
    let url = `${this.baseUrl}/contest.standings?contestId=${this.contestId}&from=1&count=10000`;

    if (this.groupId) {
      url += `&groupId=${this.groupId}`;
    }

    // Add authentication if provided
    if (this.apiKey && this.apiSecret) {
      url = this.signRequest(url, this.apiKey, this.apiSecret);
    }

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          `Contest ${this.contestId} is private or requires authentication. For mashup/private contests, you need to provide the group ID or the contest must be public.`
        );
      }
      throw new Error(
        `Failed to fetch contest data: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.status !== "OK") {
      if (data.comment && data.comment.includes("contestId")) {
        throw new Error(
          `Contest ${this.contestId} not found or is private. For mashup contests, try using the group ID if available, or make sure the contest is accessible.`
        );
      }
      throw new Error(
        `Codeforces API error: ${data.comment || "Unknown error"}`
      );
    }

    const standings: Standings = data.result;

    // Fetch all submissions to build ignored wrongs map
    const submissions = await this.getContestStatus();
    // Map: { [userHandle]: { [problemIndex]: ignoredWrongCount } }
    const ignoredWrongsMap: Record<string, Record<string, number>> = {};
    submissions.forEach((submission: Submission) => {
      if (
        submission.verdict === "WRONG_ANSWER" &&
        submission.passedTestCount === 0
      ) {
        // Get participant handle
        const participantHandle =
          submission.author.members?.[0]?.handle ||
          submission.author.teamName ||
          "Unknown";
        const problemIndex = submission.problem.index;
        if (!ignoredWrongsMap[participantHandle]) {
          ignoredWrongsMap[participantHandle] = {};
        }
        if (!ignoredWrongsMap[participantHandle][problemIndex]) {
          ignoredWrongsMap[participantHandle][problemIndex] = 0;
        }
        ignoredWrongsMap[participantHandle][problemIndex] += 1;
      }
    });

    // Calculate custom penalty for each row
    const rowsWithCustomPenalty: StandingsRowWithCustomPenalty[] =
      standings.rows.map((row) => {
        // Get handle for this row
        const participantHandle =
          row.party.members?.[0]?.handle ||
          row.party.teamName ||
          "Unknown";
        const ignoredWrongsForUser = ignoredWrongsMap[participantHandle] || {};
        const { customPenalty, solvedCount, actualWACounts } = this.calculateCustomPenalty(
          row.problemResults,
          standings.problems,
          ignoredWrongsForUser
        );

        // Add actualWACount to each problemResult
        const problemResultsWithActualWA = row.problemResults.map((pr, idx) => ({
          ...pr,
          actualWACount: actualWACounts[idx],
        }));

        return {
          ...row,
          customPenalty,
          solvedCount,
          problemResults: problemResultsWithActualWA,
        };
      });

    // Sort by solved count (descending) then by custom penalty (ascending)
    rowsWithCustomPenalty.sort((a, b) => {
      if (a.solvedCount !== b.solvedCount) {
        return b.solvedCount - a.solvedCount;
      }
      return a.customPenalty - b.customPenalty;
    });

    // Update ranks based on custom sorting (competition ranking style)
    rowsWithCustomPenalty.forEach((row, index) => {
      if (
        index > 0 &&
        row.solvedCount === rowsWithCustomPenalty[index - 1].solvedCount &&
        row.customPenalty === rowsWithCustomPenalty[index - 1].customPenalty
      ) {
        row.rank = rowsWithCustomPenalty[index - 1].rank;
      } else {
        row.rank = index + 1;
      }
    });

    // Get first solvers
    const firstSolvers = await this.getFirstSolvers();
    console.log("First solver for A:", firstSolvers["A"]);

    return {
      contest: standings.contest,
      problems: standings.problems,
      rows: rowsWithCustomPenalty,
      firstSolvers,
    };
  }

  private calculateCustomPenalty(
    problemResults: ProblemResult[],
    problems: Problem[],
    ignoredWrongsForUser: Record<string, number>
  ): {
    customPenalty: number;
    solvedCount: number;
    actualWACounts: number[];
  } {
    let customPenalty = 0;
    let solvedCount = 0;
    const actualWACounts: number[] = [];

    problemResults.forEach((result, idx) => {
      let actualWA = result.rejectedAttemptCount || 0;
      const problemIndex = problems[idx]?.index;
      if (problemIndex && ignoredWrongsForUser[problemIndex]) {
        actualWA -= ignoredWrongsForUser[problemIndex];
        if (actualWA < 0) actualWA = 0;
      }
      actualWACounts.push(actualWA);

      if (result.points > 0) {
        solvedCount++;

        // Add time penalty (in minutes)
        if (result.bestSubmissionTimeSeconds) {
          customPenalty += Math.floor(result.bestSubmissionTimeSeconds / 60);
        }
        customPenalty += actualWA * 5;
      }
    });

    return { customPenalty, solvedCount, actualWACounts };
  }

  private signRequest(url: string, apiKey: string, apiSecret: string): string {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);

    // Add required auth parameters
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");

    params.set("apiKey", apiKey);
    params.set("time", time.toString());

    // Sort parameters alphabetically
    const sortedParams = Array.from(params.entries()).sort();

    // Create query string for signing
    const queryString = sortedParams
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    // Create signature according to CF API docs
    const methodName = urlObj.pathname.replace("/api/", "");
    const toSign = `${rand}/${methodName}?${queryString}#${apiSecret}`;
    const apiSig = createHash("sha512").update(toSign).digest("hex");

    // Add signature to params
    params.set("apiSig", `${rand}${apiSig}`);

    return `${urlObj.origin}${urlObj.pathname}?${params.toString()}`;
  }

  async getContestStatus(): Promise<Submission[]> {
    try {
      let url = `${this.baseUrl}/contest.status?contestId=${this.contestId}`;

      if (this.groupId) {
        url += `&groupId=${this.groupId}`;
      }

      if (this.apiKey && this.apiSecret) {
        url = this.signRequest(url, this.apiKey, this.apiSecret);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== "OK") {
        throw new Error(`API Error: ${data.comment || "Unknown error"}`);
      }

      return data.result;
    } catch (error) {
      console.error("Error fetching contest status:", error);
      throw new Error(
        `Failed to fetch contest status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async getFirstSolvers(): Promise<{ [problemIndex: string]: string }> {
    try {
      const submissions = await this.getContestStatus();

      // Track first accepted submission for each problem using relativeTimeSeconds
      const firstSolvers: { [problemIndex: string]: string } = {};
      const firstSolveTimes: { [problemIndex: string]: number } = {};

      submissions.forEach((submission: Submission) => {
        // Only consider accepted submissions
        if (submission.verdict === "OK") {
          const problemIndex = submission.problem.index;
          // Use relativeTimeSeconds instead of creationTimeSeconds
          const submissionTime = submission.relativeTimeSeconds;

          // Get participant handle
          const participantHandle =
            submission.author.members?.[0]?.handle ||
            submission.author.teamName ||
            "Unknown";

          // Check if this is the first accepted submission for this problem
          if (
            !firstSolveTimes[problemIndex] ||
            submissionTime < firstSolveTimes[problemIndex]
          ) {
            firstSolveTimes[problemIndex] = submissionTime;
            firstSolvers[problemIndex] = participantHandle;
          }
        }
      });

      // Debug log: print all first solvers and their relative times
      console.log("First solvers and relative times:", Object.entries(firstSolvers).map(([problem, handle]) => ({ problem, handle, time: firstSolveTimes[problem] })));

      return firstSolvers;
    } catch (error) {
      console.warn("Failed to fetch first solvers:", error);
      return {};
    }
  }
}

export const codeforcesService = new CodeforcesService();
