#!/usr/bin/env node

import { CodeforcesService } from "../src/services/codeforces";
import { writeFileSync } from "fs";
import { join } from "path";

async function generateStandingsHTML() {
  try {
    console.log("Fetching standings data...");
    
    const codeforcesService = new CodeforcesService();
    const standings = await codeforcesService.getContestStandings();
    
    const html = generateHTML(standings);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `standings-${timestamp}.html`;
    const filepath = join(process.cwd(), filename);
    
    writeFileSync(filepath, html, 'utf8');
    
    console.log(`✅ Standings HTML file generated: ${filename}`);
    console.log(`📁 Location: ${filepath}`);
    console.log(`📊 Contest: ${standings.contest.name}`);
    console.log(`👥 Participants: ${standings.rows.length}`);
    console.log(`📝 Problems: ${standings.problems.length}`);
    
  } catch (error) {
    console.error("❌ Error generating standings HTML:", error);
    process.exit(1);
  }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return hours + ':' + minutes.toString().padStart(2, '0');
  }
  return minutes.toString();
}

interface StandingsRow {
  party: {
    participantType: string;
    members: Array<{ handle: string }>;
    teamName?: string;
  };
  rank: number;
  solvedCount: number;
  customPenalty: number;
  problemResults: Array<{
    points: number;
    rejectedAttemptCount: number;
    bestSubmissionTimeSeconds?: number;
    actualWACount?: number;
  }>;
}

interface Problem {
  index: string;
}

interface Standings {
  contest: { name: string; phase: string };
  problems: Problem[];
  rows: StandingsRow[];
  outOfCompetitionRows?: StandingsRow[];
  firstSolvers?: Record<string, string>;
}

function generateHTML(standings: Standings): string {
  const contestName = standings.contest.name;
  const contestPhase = standings.contest.phase;
  const generationTime = new Date().toLocaleString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contestName} - Standings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .contest-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #0f172a;
        }
        
        .contest-info {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: #64748b;
            margin-bottom: 16px;
        }
        
        .legend {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: #64748b;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 3px;
        }
        
        .solved { background-color: #22c55e; }
        .first-solver { background-color: #f59e0b; }
        .wrong-attempt { background-color: #ef4444; }
        
        .standings-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        thead {
            background-color: #f1f5f9;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        th {
            padding: 12px 8px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-right: 1px solid #e2e8f0;
            white-space: nowrap;
        }
        
        th.rank { width: 60px; }
        th.participant { min-width: 200px; }
        th.solved { width: 60px; text-align: center; }
        th.penalty { width: 80px; text-align: center; }
        th.problem { width: 60px; text-align: center; font-weight: bold; }
        
        tbody tr {
            border-bottom: 1px solid #e2e8f0;
            transition: background-color 0.2s;
        }
        
        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }
        
        tbody tr:hover {
            background-color: #f1f5f9;
        }
        
        td {
            padding: 12px 8px;
            font-size: 14px;
            border-right: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        
        .rank {
            font-weight: 600;
            color: #0f172a;
        }
        
        .participant {
            font-weight: 500;
            color: #0f172a;
        }
        
        .solved-count {
            text-align: center;
            font-weight: 600;
            color: #0f172a;
        }
        
        .penalty {
            text-align: center;
            font-family: 'Courier New', monospace;
            font-weight: 500;
            color: #0f172a;
        }
        
        .problem-cell {
            text-align: center;
            padding: 4px;
        }
        
        .problem-solved {
            background-color: #22c55e;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 6px;
            border-radius: 3px;
            display: inline-block;
            min-width: 30px;
        }
        
        .problem-first-solver {
            background-color: #f59e0b;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 6px;
            border-radius: 3px;
            display: inline-block;
            min-width: 30px;
        }
        
        .problem-wrong {
            background-color: #ef4444;
            color: white;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 6px;
            border-radius: 3px;
            display: inline-block;
            min-width: 30px;
        }
        
        .problem-empty {
            color: #94a3b8;
        }
        
        .time {
            font-size: 10px;
            opacity: 0.9;
        }
        
        .attempts {
            font-size: 10px;
            opacity: 0.75;
        }
        
        .summary-row {
            background-color: #f8fafc;
            font-weight: 600;
            color: #374151;
        }
        
        .summary-label {
            text-align: center;
            font-size: 12px;
        }
        
        .summary-count {
            text-align: center;
            font-size: 12px;
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .contest-info {
                flex-direction: column;
                gap: 8px;
            }
            
            .legend {
                flex-wrap: wrap;
                gap: 12px;
            }
            
            th, td {
                padding: 8px 4px;
                font-size: 12px;
            }
            
            .participant {
                min-width: 120px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="contest-title">${contestName}</h1>
            <div class="contest-info">
                <span>Phase: ${contestPhase}</span>
                <span>Generated: ${generationTime}</span>
                <span>Participants: ${standings.rows.length}</span>
                <span>Problems: ${standings.problems.length}</span>
            </div>
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color solved"></div>
                    <span>Solved</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color first-solver"></div>
                    <span>First Solver</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color wrong-attempt"></div>
                    <span>Wrong Attempts</span>
                </div>
            </div>
        </div>
        
        <div class="standings-table">
            <table>
                <thead>
                    <tr>
                        <th class="rank">#</th>
                        <th class="participant">Participant</th>
                        <th class="solved">=</th>
                        <th class="penalty">Penalty</th>
                        ${standings.problems.map(problem => 
                            `<th class="problem">${problem.index}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${standings.rows.map((row: StandingsRow) => `
                        <tr>
                            <td class="rank">${row.rank}</td>
                            <td class="participant">${row.party.participantType === "CONTESTANT" 
                                ? row.party.members[0]?.handle 
                                : row.party.teamName || row.party.members[0]?.handle}${(row.party.participantType === "VIRTUAL" || row.party.participantType === "PRACTICE") ? ' <span style="color: #2563eb; font-size: 0.75rem; margin-left: 0.5rem; cursor: pointer;">#</span>' : ''}</td>
                            <td class="solved-count">${row.solvedCount}</td>
                            <td class="penalty">${row.customPenalty}</td>
                            ${row.problemResults.map((result, index: number) => {
                                const problemIndex = standings.problems[index].index;
                                const participantHandle = row.party.participantType === "CONTESTANT"
                                    ? row.party.members[0]?.handle
                                    : row.party.teamName || row.party.members[0]?.handle;
                                const isFirstSolver = standings.firstSolvers?.[problemIndex] === participantHandle;
                                const actualWACount = result.actualWACount !== undefined
                                    ? result.actualWACount
                                    : result.rejectedAttemptCount || 0;
                                
                                if (result.points > 0) {
                                    const time = result.bestSubmissionTimeSeconds 
                                        ? formatTime(result.bestSubmissionTimeSeconds)
                                        : "0";
                                    const className = isFirstSolver ? "problem-first-solver" : "problem-solved";
                                    return `
                                        <td class="problem-cell">
                                            <div class="${className}">
                                                <div class="time">${time}</div>
                                                ${actualWACount > 0 ? `<div class="attempts">${actualWACount}</div>` : ''}
                                            </div>
                                        </td>
                                    `;
                                } else if (actualWACount > 0) {
                                    return `
                                        <td class="problem-cell">
                                            <div class="problem-wrong">
                                                <div>-${actualWACount}</div>
                                            </div>
                                        </td>
                                    `;
                                } else {
                                    return `<td class="problem-cell"><span class="problem-empty">-</span></td>`;
                                }
                            }).join('')}
                        </tr>
                    `).join('')}
                    
                    ${standings.outOfCompetitionRows ? standings.outOfCompetitionRows.map((row: StandingsRow) => `
                        <tr>
                            <td class="rank"></td>
                            <td class="participant">${row.party.participantType === "CONTESTANT" 
                                ? row.party.members[0]?.handle 
                                : row.party.teamName || row.party.members[0]?.handle}</td>
                            <td class="solved-count">${row.solvedCount}</td>
                            <td class="penalty"></td>
                            ${row.problemResults.map((result, index: number) => {
                                const actualWACount = result.actualWACount !== undefined
                                    ? result.actualWACount
                                    : result.rejectedAttemptCount || 0;
                                
                                if (result.points > 0) {
                                    return `
                                        <td class="problem-cell">
                                            <div class="problem-solved">
                                                <div class="time">${actualWACount === 0 ? '+' : `+${actualWACount + 1}`}</div>
                                            </div>
                                        </td>
                                    `;
                                } else if (actualWACount > 0) {
                                    return `
                                        <td class="problem-cell">
                                            <div class="problem-wrong">
                                                <div>-${actualWACount}</div>
                                            </div>
                                        </td>
                                    `;
                                } else {
                                    return `<td class="problem-cell"><span class="problem-empty">-</span></td>`;
                                }
                            }).join('')}
                        </tr>
                    `).join('') : ''}
                    
                    <!-- Summary rows -->
                    <tr class="summary-row">
                        <td colspan="4" class="summary-label">Accepted</td>
                        ${standings.problems.map((problem: Problem) => {
                            const allRows = [...standings.rows, ...(standings.outOfCompetitionRows || [])];
                            const acceptedCount = allRows.filter((row: StandingsRow) => 
                                row.problemResults[standings.problems.indexOf(problem)].points > 0
                            ).length;
                            return `<td class="summary-count">${acceptedCount}</td>`;
                        }).join('')}
                    </tr>
                    <tr class="summary-row">
                        <td colspan="4" class="summary-label">Tried</td>
                        ${standings.problems.map((problem: Problem) => {
                            const allRows = [...standings.rows, ...(standings.outOfCompetitionRows || [])];
                            const triedCount = allRows.filter((row: StandingsRow) => {
                                const result = row.problemResults[standings.problems.indexOf(problem)];
                                return result.points > 0 || result.rejectedAttemptCount > 0;
                            }).length;
                            return `<td class="summary-count">${triedCount}</td>`;
                        }).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Auto-refresh every 30 seconds if contest is running
            const contestPhase = '${contestPhase}';
            if (contestPhase === 'CODING' || contestPhase === 'PENDING_SYSTEM_TEST') {
                console.log('Contest is running. Auto-refresh disabled for static file.');
            }
            
            // Add click handlers for better mobile experience
            const table = document.querySelector('table');
            if (table) {
                table.addEventListener('click', function(e) {
                    const cell = e.target.closest('td');
                    if (cell && cell.classList.contains('problem-cell')) {
                        cell.style.transform = 'scale(1.05)';
                        setTimeout(() => {
                            cell.style.transform = 'scale(1)';
                        }, 150);
                    }
                });
            }
        });
        
        function formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) {
                return hours + ':' + minutes.toString().padStart(2, '0');
            }
            return minutes.toString();
        }
    </script>
</body>
</html>`;
}

// Run the script
generateStandingsHTML(); 