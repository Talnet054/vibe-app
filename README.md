# BigQuery Release Pulse

A beautiful, premium web dashboard tracking BigQuery Release Notes in real-time, built with Python Flask and vanilla HTML, CSS, and JS. 

The dashboard enables you to track new features, announcements, deprecations, and issues, and provides an interactive X/Twitter composer to quickly share updates using official X Web Intents.

## Features
- **Real-Time Atom XML Parsing**: Fetches release notes directly from Google Cloud Platform.
- **Category Filter & Search**: Instantly filters updates by category (Features, Announcements, Issues, Deprecations) and parses plaintext content for regex searches.
- **Glassmorphism Design System**: Sleek, immersive dark mode dashboard with ambient floating background orbs and glowing cards.
- **Interactive X Composer**: Custom mock Twitter/X editor that mimics the actual character limits (accounting for the 23-character URL limit) with a real-time progress ring indicator.
- **Server Caching**: Limits requests to Google Cloud feeds to once every 5 minutes by default, with dynamic force-refresh triggers.

## Quick Start
1. Ensure Python 3.9+ is installed.
2. Initialize virtual environment and install packages:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   python app.py
   ```
4. Access the application in your browser at `http://127.0.0.1:8080`.
