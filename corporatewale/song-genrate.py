#!/usr/bin/env python3
"""
CorporateWale - YouTube Song Downloader & JSON Generator
"""

import os
import json
import re
import csv
from pathlib import Path
import subprocess
import sys
import time

# ===== CONFIGURATION =====
BASE_DIR = Path(__file__).parent
AUDIO_DIR = BASE_DIR / "audio"
JSON_DIR = BASE_DIR / "json"
CSV_FILE = BASE_DIR / "song.csv"
JSON_FILE = JSON_DIR / "audio.json"

# Try both possible cookie file names
COOKIE_FILE = None
if (BASE_DIR / "cookie.txt").exists():
    COOKIE_FILE = BASE_DIR / "cookie.txt"
elif (BASE_DIR / "cookies.txt").exists():
    COOKIE_FILE = BASE_DIR / "cookies.txt"

# ===== PYTHON EXECUTABLE =====
PYTHON_EXE = sys.executable

# ===== CREATE DIRECTORIES =====
def create_directories():
    AUDIO_DIR.mkdir(exist_ok=True)
    JSON_DIR.mkdir(exist_ok=True)
    print(f"✅ Audio directory: {AUDIO_DIR}")
    print(f"✅ JSON directory: {JSON_DIR}")

# ===== CHECK DEPENDENCIES =====
def check_dependencies():
    try:
        result = subprocess.run(
            [PYTHON_EXE, "-m", "yt_dlp", "--version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✅ yt-dlp is installed (version: {version})")
            return True
        return False
    except:
        return False

# ===== CLEAN FILENAME =====
def clean_filename(text):
    text = re.sub(r'[<>:"/\\|?*]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# ===== EXTRACT VIDEO ID =====
def extract_video_id(url):
    if 'youtu.be' in url:
        return url.split('youtu.be/')[-1].split('?')[0].split('&')[0]
    if 'v=' in url:
        return url.split('v=')[-1].split('&')[0].split('?')[0]
    if 'embed/' in url:
        return url.split('embed/')[-1].split('?')[0].split('&')[0]
    return url

# ===== DOWNLOAD SONG (Better Format) =====
def download_song(url, output_path, retry=0):
    print(f"📥 Downloading...")
    
    video_id = extract_video_id(url)
    print(f"   🎬 Video ID: {video_id}")
    
    # Build command with better format selection
    cmd = [
        PYTHON_EXE,
    "-m", "yt_dlp",
    "-f", "bestaudio/best",
    "--extractor-args", "youtube:player_client=android,ios",   # 👈 add this line
    "--extract-audio",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "-o", str(output_path),
    "--no-playlist",
    "--quiet",
    "--no-warnings",
    ]
    
    # Add cookies if available
    if COOKIE_FILE and COOKIE_FILE.exists():
        cmd.extend(["--cookies", str(COOKIE_FILE)])
        print(f"🍪 Using cookies: {COOKIE_FILE.name}")
    else:
        print("⚠️ No cookie file found. Trying without cookies...")
    
    # Add URL
    cmd.append(f"https://www.youtube.com/watch?v={video_id}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode == 0:
            print(f"✅ Downloaded: {output_path.name}")
            return True
        else:
            error_msg = result.stderr.strip() if result.stderr else ""
            
            # Check for format error - try alternative approach
            if "Requested format is not available" in error_msg:
                print(f"🔄 Retrying with different format...")
                # Try with bestaudio (no extension preference)
                alt_cmd = [
                    PYTHON_EXE,
                    "-m", "yt_dlp",
                    "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
                    "--extract-audio",
                    "--audio-format", "mp3",
                    "--audio-quality", "0",
                    "-o", str(output_path),
                    "--no-playlist",
                    "--quiet",
                    "--no-warnings",
                ]
                if COOKIE_FILE and COOKIE_FILE.exists():
                    alt_cmd.extend(["--cookies", str(COOKIE_FILE)])
                alt_cmd.append(f"https://www.youtube.com/watch?v={video_id}")
                
                try:
                    alt_result = subprocess.run(alt_cmd, capture_output=True, text=True, timeout=600)
                    if alt_result.returncode == 0:
                        print(f"✅ Downloaded: {output_path.name}")
                        return True
                except:
                    pass
            
            if "Sign in to confirm" in error_msg:
                print(f"❌ Bot detection! Cookies may be expired.")
                print(f"   Please re-export cookies from browser.")
                return False
            
            if "cookie" in error_msg.lower():
                print(f"❌ Cookie error. Please re-export cookies.")
                return False
            
            # Check if it's a private/deleted video
            if "Private video" in error_msg or "Video unavailable" in error_msg:
                print(f"❌ Video is private or unavailable")
                return False
            
            print(f"❌ Download failed: {error_msg[:150]}")
            return False
    except subprocess.TimeoutExpired:
        print(f"❌ Download timeout")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

# ===== READ EXISTING JSON =====
def read_existing_json():
    if not JSON_FILE.exists():
        print("ℹ️ No existing audio.json found. Creating new...")
        return []
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('songs', [])
    except:
        return []

# ===== CHECK DUPLICATE =====
def is_duplicate(existing, title, artist):
    for song in existing:
        if song.get('title', '').lower() == title.lower() and song.get('artist', '').lower() == artist.lower():
            return True
    return False

# ===== READ CSV =====
def read_csv_file(existing_songs):
    if not CSV_FILE.exists():
        print(f"❌ CSV not found: {CSV_FILE}")
        return [], []
    
    songs = []
    duplicates = []
    try:
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('url'):
                    title = row.get('title', '').strip()
                    artist = row.get('artist', '').strip()
                    url = row.get('url', '').strip()
                    
                    if is_duplicate(existing_songs, title, artist):
                        duplicates.append({'title': title, 'artist': artist})
                    else:
                        songs.append({
                            'title': title,
                            'artist': artist,
                            'url': url,
                            'description': row.get('description', '').strip()
                        })
        print(f"✅ Found {len(songs)} new songs")
        if duplicates:
            print(f"⏭️ Skipped {len(duplicates)} duplicates")
        return songs, duplicates
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return [], []

# ===== GENERATE JSON =====
def generate_audio_json(existing_songs, new_songs):
    all_songs = existing_songs.copy()
    max_id = max([s.get('id', 0) for s in all_songs]) if all_songs else 0
    
    for idx, song in enumerate(new_songs, start=max_id + 1):
        clean_title = clean_filename(song['title'])
        clean_artist = clean_filename(song['artist'])
        filename = f"{clean_title} - {clean_artist}.mp3"
        all_songs.append({
            "id": idx,
            "title": song['title'],
            "artist": song['artist'],
            "file": f"../audio/{filename}",
            "description": song.get('description', f"{song['title']} - {song['artist']}")
        })
    
    all_songs.sort(key=lambda x: x.get('id', 0))
    
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump({"songs": all_songs}, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Updated: {JSON_FILE} with {len(all_songs)} total songs")
    return True

# ===== MAIN =====
def main():
    print("=" * 60)
    print("🎵 CorporateWale - YouTube Song Downloader")
    print("=" * 60)
    
    create_directories()
    
    if not check_dependencies():
        print("❌ yt-dlp not installed. Installing...")
        subprocess.run([PYTHON_EXE, "-m", "pip", "install", "yt-dlp"], check=True)
    
    # Check cookie file
    if COOKIE_FILE and COOKIE_FILE.exists():
        print(f"🍪 Found cookie file: {COOKIE_FILE.name}")
        print(f"   Size: {COOKIE_FILE.stat().st_size} bytes")
    else:
        print("\n⚠️ Cookie file not found!")
        print("   Script will try without cookies...")
    
    existing = read_existing_json()
    print(f"📊 Existing songs: {len(existing)}")
    
    new_songs, duplicates = read_csv_file(existing)
    if not new_songs:
        print("\n✅ No new songs to download!")
        return
    
    print(f"\n📥 Downloading {len(new_songs)} new songs...")
    print("-" * 60)
    
    downloaded = []
    failed = []
    
    for idx, song in enumerate(new_songs, start=1):
        print(f"\n[{idx}/{len(new_songs)}] {song['title']} - {song['artist']}")
        
        clean_title = clean_filename(song['title'])
        clean_artist = clean_filename(song['artist'])
        filename = f"{clean_title} - {clean_artist}.mp3"
        output_path = AUDIO_DIR / filename
        
        if output_path.exists():
            print(f"✅ Already exists: {filename}")
            downloaded.append(song)
            continue
        
        if download_song(song['url'], output_path):
            downloaded.append(song)
        else:
            failed.append(song)
        
        # Delay between downloads
        if idx < len(new_songs):
            time.sleep(2)
    
    if downloaded:
        print(f"\n📝 Updating audio.json with {len(downloaded)} new songs...")
        generate_audio_json(existing, downloaded)
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"New songs from CSV: {len(new_songs)}")
    print(f"✅ Downloaded: {len(downloaded)}")
    print(f"❌ Failed: {len(failed)}")
    print(f"⏭️ Duplicates skipped: {len(duplicates)}")
    print(f"📁 Total songs now: {len(existing) + len(downloaded)}")
    print("=" * 60)

if __name__ == "__main__":
    main()