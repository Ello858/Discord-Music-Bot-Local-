# Discord Music Bot (Self-Hosted)

A Discord music bot that plays audio from YouTube and SoundCloud, designed to run on your own machine 24/7.

## Features

- Play music from YouTube and SoundCloud by name or URL
- Queue system for multiple songs
- Playback controls: play, pause, resume, skip, stop, volume
- Now-playing announcements in chat
- Crash recovery via PM2
- Auto-restarts on reboot (PM2)

## Prerequisites

- **Node.js v20+** — [nodejs.org](https://nodejs.org)
- **FFmpeg** — see install instructions below
- **A Discord bot token** — [Discord Developer Portal](https://discord.com/developers/applications)

### Installing FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add it to your PATH.

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/discord-music-bot-local.git
cd discord-music-bot-local
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your config file

Copy the example and fill in your token:

```bash
cp config.example.json config.json
```

Edit `config.json`:
```json
{
  "token": "YOUR_BOT_TOKEN_HERE",
  "prefix": "!"
}
```

> ⚠️ **Never commit `config.json` to GitHub.** It's already in `.gitignore`.

### 4. Run the bot

**Basic (closes when you close the terminal):**
```bash
node index.js
```

**Recommended — keep it running with PM2:**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save                        # remember this on reboot
pm2 startup                     # auto-start PM2 on system boot (follow the printed command)
```

---

## PM2 Cheat Sheet

```bash
pm2 status                        # check if bot is running
pm2 logs discord-music-bot        # view live logs
pm2 restart discord-music-bot     # restart the bot
pm2 stop discord-music-bot        # stop the bot
pm2 delete discord-music-bot      # remove from PM2
```

---

## Commands

| Command | Description |
|---|---|
| `!play <song or URL>` | Play a song or add it to the queue |
| `!skip` | Skip the current song |
| `!stop` | Stop playback and clear the queue |
| `!queue` | Show what's currently playing and up next |
| `!pause` | Pause playback |
| `!resume` | Resume playback |
| `!volume [0-100]` | Check or set the volume |
| `!ping` | Check bot latency |
| `!help` | Show all commands |

---

## Getting a Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to the **Bot** tab → click **Add Bot**
4. Copy your token and paste it into `config.json`
5. Under **Privileged Gateway Intents**, enable:
   - **Server Members Intent**
   - **Message Content Intent**
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Permissions: `Send Messages`, `Connect`, `Speak`
7. Copy the generated URL, open it in a browser, and invite the bot to your server

---

## Troubleshooting

**Bot joins but doesn't play audio**
- Make sure FFmpeg is installed: run `ffmpeg -version` in your terminal
- Check PM2 logs for errors: `pm2 logs discord-music-bot`

**"No results found"**
- Try including the artist name: `!play never gonna give you up rick astley`
- Try pasting a direct YouTube URL instead

**Bot crashes and doesn't come back**
- PM2 handles restarts automatically. Check `pm2 status` to confirm it's configured
- If it's crashing rapidly, check `pm2 logs` for the root cause

---

## Built With

- [discord.js](https://discord.js.org/) — Discord API wrapper
- [discord-player](https://discord-player.js.org/) — Music player engine
- [@discord-player/extractor](https://github.com/discordjs/discord-player) — YouTube/SoundCloud extractors
- [PM2](https://pm2.keymetrics.io/) — Process manager for keeping the bot alive
