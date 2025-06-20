import { StandingsWithCustomPenalty } from "@/schema";

export class ContestService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api`;
  }

  /**
   * Fetches contest standings from the API
   * @returns Promise containing the contest standings with custom penalty calculations
   */
  async getContestStandings(): Promise<StandingsWithCustomPenalty> {
    try {
      const response = await fetch(`${this.baseUrl}/contest/standings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch contest standings: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.standings) {
        throw new Error("Invalid response format: standings data not found");
      }

      return data.standings;
    } catch (error) {
      console.error("Error fetching contest standings:", error);
      throw new Error(
        `Failed to fetch contest standings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

// Export a singleton instance
export const contestService = new ContestService();
