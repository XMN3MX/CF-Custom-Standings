#!/usr/bin/env node

const { writeFileSync } = require('fs');
const { join } = require('path');
const https = require('https');
const http = require('http');

async function fetchStandings() {
  return new Promise((resolve, reject) => {
    // Try to fetch from local API first, then fallback to direct Codeforces API
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/contest/standings',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.standings) {
            resolve(result.standings);
          } else {
            reject(new Error('No standings data in response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('Local API not available, trying direct Codeforces API...');
      // Fallback to direct Codeforces API
      fetchFromCodeforces().then(resolve).catch(reject);
    });

    req.end();
  });
}

async function fetchFromCodeforces() {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.API_KEY;
    const apiSecret = process.env.API_SECRET;
    const groupId = process.env.GROUP_ID;
    const contestId = process.env.CONTEST_ID;

    if (!apiKey || !apiSecret || !groupId || !contestId) {
      reject(new Error('Missing environment variables: API_KEY, API_SECRET, GROUP_ID, CONTEST_ID'));
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'contest.standings';
    const params = `groupCode=${groupId}&contestId=${contestId}&showUnofficial=false`;
    const rand = Math.floor(Math.random() * 900000) + 100000;
    
    const sig = generateSignature(rand, method, params, apiSecret);
    const url = `https://codeforces.com/api/${method}?${params}&apiKey=${apiKey}&time=${timestamp}&apiSig=${rand}${sig}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.status === 'OK') {
            resolve(processStandingsData(result.result));
          } else {
            reject(new Error(`Codeforces API error: ${result.comment}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function generateSignature(rand, method, params, secret) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha512');
  const sig = `${rand}/${method}?${params}#${secret}`;
  hash.update(sig);
  return hash.digest('hex');
}

function processStandingsData(data) {
  // Transform Codeforces API data to match your app's format
  const contest = data.contest;
  const problems = data.problems;
  const rows = data.rows.map(row => ({
    party: row.party,
    rank: row.rank,
    points: row.points,
    penalty: row.penalty,
    successfulHackCount: row.successfulHackCount,
    unsuccessfulHackCount: row.unsuccessfulHackCount,
    problemResults: row.problemResults,
    customPenalty: row.penalty, // You might need to calculate this
    solvedCount: row.problemResults.filter(r => r.points > 0).length
  }));

  // Calculate first solvers
  const firstSolvers = {};
  problems.forEach(problem => {
    const firstSolved = rows.find(row => 
      row.problemResults[problems.indexOf(problem)].points > 0
    );
    if (firstSolved) {
      firstSolvers[problem.index] = firstSolved.party.members[0]?.handle || firstSolved.party.teamName;
    }
  });

  return {
    contest,
    problems,
    rows,
    firstSolvers
  };
}

async function generateStandingsHTML() {
  try {
    console.log("Fetching standings data...");
    
    const standings = await fetchStandings();
    
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

function formatTime(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  return totalMinutes.toString();
}

function generateHTML(standings) {
  const contestName = standings.contest.name;
  const generationTime = new Date().toLocaleString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Final Standings</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --background: oklch(1 0 0);
            --foreground: oklch(0.145 0 0);
            --card: oklch(1 0 0);
            --card-foreground: oklch(0.145 0 0);
            --muted: oklch(0.97 0 0);
            --muted-foreground: oklch(0.556 0 0);
            --border: oklch(0.922 0 0);
            --wrong-attempt: oklch(0.577 0.245 27.325);
            --wrong-attempt-foreground: oklch(0.985 0 0);
            --solved: oklch(0.7704 0.2564 143.17);
            --solved-foreground: oklch(0.985 0 0);
            --first-solver: oklch(0.4909 0.1614 143.55);
            --first-solver-foreground: oklch(0.985 0 0);
        }
        
        .dark {
            --background: oklch(0.145 0 0);
            --foreground: oklch(0.985 0 0);
            --card: oklch(0.205 0 0);
            --card-foreground: oklch(0.985 0 0);
            --muted: oklch(0.269 0 0);
            --muted-foreground: oklch(0.708 0 0);
            --border: oklch(1 0 0 / 10%);
            --wrong-attempt: oklch(0.577 0.245 27.325);
            --wrong-attempt-foreground: oklch(0.985 0 0);
            --solved: oklch(0.7704 0.2564 143.17);
            --solved-foreground: oklch(0.985 0 0);
            --first-solver: oklch(0.4909 0.1614 143.55);
            --first-solver-foreground: oklch(0.985 0 0);
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background-color: var(--background); 
            color: var(--foreground); 
            line-height: 1.6; 
        }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        
        .header { 
            background: var(--card); 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 20px; 
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); 
            border: 1px solid var(--border);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .contest-title { 
            font-size: 24px; 
            font-weight: bold; 
            color: var(--card-foreground); 
        }
        
        .theme-toggle {
            background: var(--muted);
            border: 1px solid var(--border);
            color: var(--muted-foreground);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .theme-toggle:hover {
            background: var(--accent);
        }
        
        .legend { display: flex; gap: 16px; font-size: 12px; color: var(--muted-foreground); }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-color { width: 16px; height: 16px; border-radius: 3px; }
        .solved { background-color: var(--solved); }
        .first-solver { background-color: var(--first-solver); }
        .wrong-attempt { background-color: var(--wrong-attempt); }
        
        .standings-table { 
            background: var(--card); 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); 
            border: 1px solid var(--border);
        }
        
        table { width: 100%; border-collapse: collapse; }
        thead { background-color: var(--muted); position: sticky; top: 0; z-index: 10; }
        th { 
            padding: 12px 8px; 
            text-align: left; 
            font-size: 12px; 
            font-weight: 600; 
            color: var(--muted-foreground); 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            border-right: 1px solid var(--border); 
            white-space: nowrap; 
        }
        th.rank { width: 60px; }
        th.participant { min-width: 200px; }
        th.solved { width: 60px; text-align: center; }
        th.penalty { width: 80px; text-align: center; }
        th.problem { width: 60px; text-align: center; font-weight: bold; }
        
        tbody tr { border-bottom: 1px solid var(--border); transition: background-color 0.2s; }
        tbody tr:nth-child(even) { background-color: var(--muted); }
        tbody tr:hover { background-color: var(--accent); }
        
        td { 
            padding: 12px 8px; 
            font-size: 14px; 
            border-right: 1px solid var(--border); 
            vertical-align: middle; 
        }
        
        .rank { font-weight: 600; color: var(--card-foreground); }
        .participant { font-weight: 500; color: var(--card-foreground); }
        .solved-count { 
            text-align: center; 
            font-weight: 600; 
            color: var(--card-foreground) !important; 
            background: transparent !important;
        }
        .penalty { text-align: center; font-family: 'Courier New', monospace; font-weight: 500; color: var(--card-foreground); }
        .problem-cell { text-align: center; padding: 4px; }
        
        .problem-solved { 
            background-color: var(--solved); 
            color: var(--solved-foreground); 
            font-size: 11px; 
            font-weight: bold; 
            padding: 4px 6px; 
            border-radius: 3px; 
            display: inline-block; 
            min-width: 30px; 
        }
        
        .problem-first-solver { 
            background-color: var(--first-solver); 
            color: var(--first-solver-foreground); 
            font-size: 11px; 
            font-weight: bold; 
            padding: 4px 6px; 
            border-radius: 3px; 
            display: inline-block; 
            min-width: 30px; 
        }
        
        .problem-wrong { 
            background-color: var(--wrong-attempt); 
            color: var(--wrong-attempt-foreground); 
            font-size: 11px; 
            font-weight: bold; 
            padding: 4px 6px; 
            border-radius: 3px; 
            display: inline-block; 
            min-width: 30px; 
        }
        
        .problem-empty { color: var(--muted-foreground); }
        .time { font-size: 10px; opacity: 0.9; }
        .attempts { font-size: 10px; opacity: 0.75; }
        
        .summary-row { background-color: var(--muted); font-weight: 600; color: var(--muted-foreground); }
        .summary-label { text-align: center; font-size: 12px; }
        .summary-count { text-align: center; font-size: 12px; font-weight: bold; }
        
        @media (max-width: 768px) { 
            .container { padding: 10px; } 
            .header-top { flex-direction: column; gap: 12px; align-items: flex-start; }
            .legend { flex-wrap: wrap; gap: 12px; } 
            th, td { padding: 8px 4px; font-size: 12px; } 
            .participant { min-width: 120px; } 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-top">
                <h1 class="contest-title">${contestName}</h1>
                <button class="theme-toggle" onclick="toggleTheme()">🌙 Dark Mode</button>
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
                    ${standings.rows.map(row => `
                        <tr>
                            <td class="rank">${row.rank}</td>
                            <td class="participant">${row.party.participantType === "CONTESTANT" 
                                ? row.party.members[0]?.handle 
                                : row.party.teamName || row.party.members[0]?.handle}</td>
                            <td class="solved-count">${row.solvedCount}</td>
                            <td class="penalty">${row.customPenalty || row.penalty}</td>
                            ${row.problemResults.map((result, index) => {
                                const problemIndex = standings.problems[index].index;
                                const participantHandle = row.party.participantType === "CONTESTANT"
                                    ? row.party.members[0]?.handle
                                    : row.party.teamName || row.party.members[0]?.handle;
                                const isFirstSolver = standings.firstSolvers?.[problemIndex] === participantHandle;
                                const rejectedAttemptCount = result.rejectedAttemptCount || 0;
                                
                                if (result.points > 0) {
                                    const time = result.bestSubmissionTimeSeconds 
                                        ? formatTime(result.bestSubmissionTimeSeconds)
                                        : "0";
                                    const className = isFirstSolver ? "problem-first-solver" : "problem-solved";
                                    return `
                                        <td class="problem-cell">
                                            <div class="${className}">
                                                <div class="time">${time}</div>
                                                ${rejectedAttemptCount > 0 ? `<div class="attempts">${rejectedAttemptCount}</div>` : ''}
                                            </div>
                                        </td>
                                    `;
                                } else if (rejectedAttemptCount > 0) {
                                    return `
                                        <td class="problem-cell">
                                            <div class="problem-wrong">
                                                <div>-${rejectedAttemptCount}</div>
                                            </div>
                                        </td>
                                    `;
                                } else {
                                    return `<td class="problem-cell"><span class="problem-empty">-</span></td>`;
                                }
                            }).join('')}
                        </tr>
                    `).join('')}
                    
                    <!-- Summary rows -->
                    <tr class="summary-row">
                        <td colspan="4" class="summary-label">Accepted</td>
                        ${standings.problems.map(problem => {
                            const acceptedCount = standings.rows.filter(row => 
                                row.problemResults[standings.problems.indexOf(problem)].points > 0
                            ).length;
                            return `<td class="summary-count">${acceptedCount}</td>`;
                        }).join('')}
                    </tr>
                    <tr class="summary-row">
                        <td colspan="4" class="summary-label">Tried</td>
                        ${standings.problems.map(problem => {
                            const triedCount = standings.rows.filter(row => {
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
        function toggleTheme() {
            const body = document.body;
            const button = document.querySelector('.theme-toggle');
            
            if (body.classList.contains('dark')) {
                body.classList.remove('dark');
                button.textContent = '🌙 Dark Mode';
            } else {
                body.classList.add('dark');
                button.textContent = '☀️ Light Mode';
            }
        }
        
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            document.querySelector('.theme-toggle').textContent = '☀️ Light Mode';
        }
        
        // Save theme preference
        document.querySelector('.theme-toggle').addEventListener('click', function() {
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'light' : 'dark');
        });
    </script>
</body>
</html>`;
}

// Run the script
generateStandingsHTML(); 