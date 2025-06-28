# Standings HTML Generator

This script generates static HTML standings files that can be shared and viewed offline.

## Features

- ✅ Generates standalone HTML files with embedded CSS
- ✅ Includes contest information and generation timestamp
- ✅ Shows participant rankings, solved problems, and penalties
- ✅ Highlights first solvers and wrong attempts
- ✅ Responsive design for mobile devices
- ✅ Summary statistics (accepted/tried counts)
- ✅ No external dependencies - completely self-contained

## Usage

### Method 1: Using npm script (Recommended)

```bash
npm run generate-standings
```

### Method 2: Direct Node.js execution

```bash
node scripts/generate-standings.js
```

### Method 3: Windows Batch file

Double-click `generate-standings.bat` or run it from command prompt.

## Prerequisites

1. **Environment Variables**: Make sure these are set in your `.env` file or system:
   - `API_KEY` - Your Codeforces API key
   - `API_SECRET` - Your Codeforces API secret
   - `GROUP_ID` - Your Codeforces group ID
   - `CONTEST_ID` - The contest ID you want standings for

2. **Node.js**: Make sure Node.js is installed and in your PATH

## How it works

1. **Data Fetching**: The script first tries to fetch data from your local API (`http://localhost:3000/api/contest/standings`)
2. **Fallback**: If the local API is not available, it falls back to directly calling the Codeforces API
3. **HTML Generation**: Creates a complete HTML file with embedded CSS and JavaScript
4. **File Output**: Saves the file with timestamp in the project root directory

## Output

The script generates a file named `standings-YYYY-MM-DDTHH-MM-SS-sssZ.html` in your project root directory.

### File Contents

- **Contest Information**: Name, phase, generation time
- **Participant Rankings**: Rank, handle/team name, solved count, penalty
- **Problem Results**: Time taken, wrong attempts, first solver indicators
- **Summary Statistics**: Accepted and tried counts for each problem
- **Responsive Design**: Works on desktop and mobile devices

## Example Output

```
✅ Standings HTML file generated: standings-2024-01-15T10-30-45-123Z.html
📁 Location: C:\Users\username\Desktop\CF-Custom-Standings\standings-2024-01-15T10-30-45-123Z.html
📊 Contest: Codeforces Round #123 (Div. 2)
👥 Participants: 150
📝 Problems: 6
```

## Troubleshooting

### "Local API not available" message
This is normal if your Next.js development server isn't running. The script will automatically fall back to the direct Codeforces API.

### "Missing environment variables" error
Make sure all required environment variables are set:
- Check your `.env` file
- Or set them in your system environment variables

### "Codeforces API error" message
- Verify your API credentials are correct
- Check if the contest exists and is accessible
- Ensure your API key has the necessary permissions

## Customization

You can modify the `scripts/generate-standings.js` file to:
- Change the HTML template and styling
- Add more information to the standings
- Modify the file naming convention
- Add additional features like export options

## Sharing

The generated HTML file is completely self-contained and can be:
- Opened in any web browser
- Shared via email or file sharing
- Uploaded to a web server
- Printed or saved as PDF 