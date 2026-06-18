from flask import Flask, jsonify, render_template, request
import requests
import feedparser
from bs4 import BeautifulSoup
import re
import hashlib
import time

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_updated": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def fetch_and_parse_feed():
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        return {"error": f"Failed to fetch feed: {str(e)}"}
        
    feed = feedparser.parse(response.content)
    if not feed.entries:
        feed = feedparser.parse(response.text)

    updates = []
    for entry_idx, entry in enumerate(feed.entries):
        date_str = entry.title  # e.g., "June 17, 2026"
        published_str = entry.get('updated', '')
        link = entry.get('link', '')
        entry_id = entry.get('id', f"entry_{entry_idx}")
        
        # Parse content
        content_val = ""
        if 'content' in entry and len(entry.content) > 0:
            content_val = entry.content[0].value
        elif 'summary' in entry:
            content_val = entry.summary
            
        if not content_val:
            continue
            
        soup = BeautifulSoup(content_val, 'html.parser')
        h3_tags = soup.find_all('h3')
        
        if not h3_tags:
            text_content = soup.get_text().strip()
            update_id = hashlib.md5(f"{entry_id}_0".encode('utf-8')).hexdigest()
            updates.append({
                "id": update_id,
                "date": date_str,
                "date_iso": published_str,
                "link": link,
                "type": "Update",
                "html": content_val,
                "text": text_content
            })
            continue
            
        for i, h3 in enumerate(h3_tags):
            update_type = h3.get_text().strip()
            
            # Find sibling elements until next h3
            sibling_html = []
            sibling_text = []
            next_node = h3.next_sibling
            while next_node and next_node.name != 'h3':
                if next_node.name:
                    sibling_html.append(str(next_node))
                    sibling_text.append(next_node.get_text())
                elif isinstance(next_node, str):
                    stripped = next_node.strip()
                    if stripped:
                        sibling_text.append(stripped)
                next_node = next_node.next_sibling
                
            html_content = "".join(sibling_html)
            text_content = " ".join(sibling_text).strip()
            text_content = re.sub(r'\s+', ' ', text_content)
            
            update_id = hashlib.md5(f"{entry_id}_{i}".encode('utf-8')).hexdigest()
            
            updates.append({
                "id": update_id,
                "date": date_str,
                "date_iso": published_str,
                "link": link,
                "type": update_type,
                "html": html_content,
                "text": text_content
            })
            
    return {
        "updates": updates,
        "title": feed.feed.get('title', 'BigQuery Release Notes'),
        "feed_link": feed.feed.get('link', 'https://cloud.google.com/bigquery/docs/release-notes')
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_updated"] > CACHE_DURATION):
        data = fetch_and_parse_feed()
        if "error" not in data:
            cache["data"] = data
            cache["last_updated"] = current_time
        else:
            # If fetch failed but we have cached data, return cached data with warning
            if cache["data"]:
                return jsonify({
                    **cache["data"],
                    "warning": "Could not refresh feed. Displaying cached data.",
                    "cached_at": cache["last_updated"]
                })
            return jsonify(data), 500
            
    return jsonify({
        **cache["data"],
        "cached_at": cache["last_updated"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=8080)
