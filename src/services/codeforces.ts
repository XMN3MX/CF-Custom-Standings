import {
  Standings,
  StandingsWithCustomPenalty,
  StandingsRowWithCustomPenalty,
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

    // Calculate custom penalty for each row
    const rowsWithCustomPenalty: StandingsRowWithCustomPenalty[] =
      standings.rows.map((row) => {
        const { customPenalty, solvedCount } = this.calculateCustomPenalty(
          row.problemResults
        );

        return {
          ...row,
          customPenalty,
          solvedCount,
        };
      });

    // Sort by solved count (descending) then by custom penalty (ascending)
    rowsWithCustomPenalty.sort((a, b) => {
      if (a.solvedCount !== b.solvedCount) {
        return b.solvedCount - a.solvedCount;
      }
      return a.customPenalty - b.customPenalty;
    });

    // Update ranks based on custom sorting
    rowsWithCustomPenalty.forEach((row, index) => {
      row.rank = index + 1;
    });

    // Get first solvers
    const firstSolvers = await this.getFirstSolvers();

    return {
      contest: standings.contest,
      problems: standings.problems,
      rows: rowsWithCustomPenalty,
      firstSolvers,
    };
  }

  private calculateCustomPenalty(problemResults: any[]): {
    customPenalty: number;
    solvedCount: number;
  } {
    let customPenalty = 0;
    let solvedCount = 0;

    problemResults.forEach((result) => {
      if (result.points > 0) {
        solvedCount++;

        // Add time penalty (in minutes)
        if (result.bestSubmissionTimeSeconds) {
          customPenalty += Math.floor(result.bestSubmissionTimeSeconds / 60);
        }

        // Add WA penalty: 5 points per wrong attempt, excluding likely WA1
        // Since we can't determine exact test cases, assume WA1 if there are wrong attempts
        let wrongAttempts = result.rejectedAttemptCount || 0;
        if (wrongAttempts > 0) {
          wrongAttempts = Math.max(0, wrongAttempts - 1); // Exclude presumed WA1
        }
        customPenalty += wrongAttempts * 5;
      } else {
        // For unsolved problems, also exclude presumed WA1
        let wrongAttempts = result.rejectedAttemptCount || 0;
        if (wrongAttempts > 0) {
          wrongAttempts = Math.max(0, wrongAttempts - 1); // Exclude presumed WA1
        }
        customPenalty += wrongAttempts * 5;
      }
    });

    return { customPenalty, solvedCount };
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

  async getContestStatus(): Promise<any> {
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

      return data.result; // Returns array of submissions
    } catch (error) {
      console.error("Error fetching contest status:", error);
      throw new Error(
        `Failed to fetch contest status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async checkContestExists(): Promise<boolean> {
    try {
      await this.getContestStandings();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getFirstSolvers(): Promise<{ [problemIndex: string]: string }> {
    try {
      const submissions = await this.getContestStatus();

      // Track first accepted submission for each problem
      const firstSolvers: { [problemIndex: string]: string } = {};
      const firstSolveTimes: { [problemIndex: string]: number } = {};

      submissions.forEach((submission: any) => {
        // Only consider accepted submissions
        if (submission.verdict === "OK") {
          const problemIndex = submission.problem.index;
          const submissionTime = submission.creationTimeSeconds;

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

      return firstSolvers;
    } catch (error) {
      console.warn("Failed to fetch first solvers:", error);
      return {};
    }
  }
}

export const codeforcesService = new CodeforcesService();
