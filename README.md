# Daily Staffing Manager

A streamlined web application for managing daily production line staffing with core associate management, real-time tracking, and waitlist functionality.

## Features

### 🎯 Core Functionality
- **Quick Shift Setup**: Enter line letters, leads, and worker requirements
- **Core Associate Management**: Pre-configure core associates for each line lead with training notes
- **Automatic Pre-filling**: Core associates are automatically assigned to their lead's lines
- **Arrival Tracking**: Mark core associates as arrived; remove and reassign if they don't show
- **Live Staffing**: Assign associates to open positions as they arrive
- **Waitlist System**: Track associates who've arrived but haven't been assigned yet
- **New Associate Flagging**: Mark first-day associates for special attention

### 💾 Data Persistence
- All data is saved to browser localStorage
- Core associates are remembered across sessions
- Export staffing data as JSON for record-keeping

## Installation Options

### Option 1: Direct File Usage (Easiest)
1. Download `index.html` to your computer
2. Double-click the file to open it in your web browser
3. Start using immediately - no installation required!

### Option 2: GitHub Pages (For Team Access)
1. Fork or upload to a GitHub repository
2. Go to repository Settings → Pages
3. Select "main" branch and save
4. Access via: `https://yourusername.github.io/repository-name`

### Option 3: Local Web Server
```bash
# If you have Python installed:
python -m http.server 8000

# Then open: http://localhost:8000
```

## How to Use

### Initial Setup

#### 1. Configure Core Associates (One-time setup)
1. Go to the **"Core Associates"** tab
2. Select an existing lead or create a new one
3. Add associates with optional training notes (e.g., "Flow Wrapper trained", "Sanitation Trained")
4. These associates will automatically pre-fill positions when their lead is assigned

#### 2. Setup Daily Shift
1. Go to the **"Setup Shift"** tab
2. For each production line, enter:
   - **Line Letter** (A, B, C, etc.)
   - **Line Lead** (type to search existing leads)
   - **Associates Needed** (number after subtracting Crescent workers)
3. Click **"Add Another Line"** to configure multiple lines
4. Click **"Start Staffing"** when ready

### During Staffing

#### The Main Staffing View
- Shows all configured lines with their positions
- Progress bar shows filled vs. total positions
- Color-coded position slots:
  - **Yellow**: Core associate (not yet arrived)
  - **Green**: Arrived and assigned
  - **Blue**: New associate (first day)
  - **Gray**: Empty position

#### Arrival Process
1. **Core Associates Arrive**: Click "✓ Arrived" button on their pre-filled slot
2. **New Associates Arrive**: 
   - Click "➕ Add Associate" (top right)
   - Enter name and check "First Day" if applicable
   - Choose to assign to a specific line or add to waitlist

#### Assignment Options
- **Assign button**: Type a name to assign to that specific position
- **From Waitlist**: Select from associates already waiting
- **Remove**: Clear a position if needed (e.g., core associate no-show)

#### Waitlist Management
- Associates on the waitlist show at the bottom with arrival time
- Click their name or use "From Waitlist" button to assign them
- Remove from waitlist if they leave

### End of Day
- Click **"Export Data"** to save staffing records as JSON
- Click **"Clear All"** to reset for the next day (warning: cannot be undone)

## Browser Compatibility

Works on all modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS/Android)

## Data Storage

- **Local Storage**: All data is stored in your browser
- **Privacy**: No data is sent to external servers
- **Persistence**: Data survives page refreshes but is browser-specific
- **Export**: Download JSON files for permanent records

## Tips for Efficiency

1. **Pre-configure all core associates** before your first shift
2. **Use the datalist** - start typing a lead name and it auto-suggests
3. **Keyboard shortcuts**: Press Enter in modals to quickly confirm
4. **Mobile-friendly**: Use on tablets/phones during staffing
5. **Multiple tabs**: Open in multiple browser tabs if needed (data syncs)

## Troubleshooting

**Q: My data disappeared!**
- Data is browser-specific. Use the same browser and don't clear browser data.
- Export regularly to have backups.

**Q: Can multiple people use this simultaneously?**
- Not directly (uses local storage). Consider:
  - One person operates while others call out names
  - Use GitHub Pages + screen sharing
  - Export and share JSON files

**Q: How do I reset everything?**
- Click "Clear All" (only clears current shift)
- To clear core associates: Use browser developer tools to clear localStorage

**Q: Can I customize the colors/layout?**
- Yes! Edit the CSS in the `<style>` section of index.html

## Future Enhancements (Potential)

- Firebase/database integration for multi-user access
- Print-friendly reports
- Excel import/export
- Attendance history tracking
- Performance metrics dashboard

## Technical Details

- **Framework**: React 18 (CDN)
- **Storage**: Browser localStorage
- **Dependencies**: None (all libraries loaded via CDN)
- **File Size**: Single HTML file (~25KB)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for errors (F12)
3. Export your data before making changes

---

**Version**: 1.0  
**Last Updated**: November 2025  
**License**: Free to use and modify
