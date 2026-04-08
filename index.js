// -------------------------
// Required modules
// -------------------------
const { Client, GatewayIntentBits } = require('discord.js');
const { Player, QueryType } = require('discord-player');
const extractor = require('@discord-player/extractor');
const { exec } = require('child_process');

// Load config
let config;
try {
    config = {
        token: process.env.BOT_TOKEN || require('./config.json').token,
        prefix: process.env.PREFIX || require('./config.json').prefix || "!"
    };
} catch (e) {
    console.error("❌ Could not load config.json. Make sure it exists with your bot token.");
    process.exit(1);
}

// -------------------------
// Create Discord client
// -------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// -------------------------
// Create the player
// -------------------------
const player = new Player(client, {
    skipFFmpeg: false,
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        filter: 'audioonly'
    }
});

const PREFIX = config.prefix;

// -------------------------
// Bot ready
// -------------------------
client.once('ready', async () => {
    console.log(`==============================`);
    console.log(`✅ Bot is online as ${client.user.tag}`);
    console.log(`   Node version:       ${process.version}`);
    console.log(`   Discord.js version: ${require('discord.js').version}`);
    console.log(`   discord-player:     ${require('discord-player/package.json').version}`);
    console.log(`   Prefix:             ${PREFIX}`);

    // Check FFmpeg
    exec('ffmpeg -version', (error, stdout) => {
        if (error) {
            console.log(`❌ FFmpeg not found! Please install it:`);
            console.log(`   Ubuntu/Debian: sudo apt install ffmpeg`);
            console.log(`   macOS:         brew install ffmpeg`);
            console.log(`   Windows:       https://ffmpeg.org/download.html`);
        } else {
            console.log(`✅ FFmpeg: ${stdout.split('\n')[0]}`);
        }
    });

    // Load extractors
    try {
        await player.extractors.loadMulti(extractor.DefaultExtractors);
        console.log(`✅ Extractors loaded`);
    } catch (error) {
        console.log(`❌ Extractor error: ${error.message}`);
    }

    console.log(`==============================`);
});

// -------------------------
// Player events
// -------------------------
player.events.on('error', (queue, error) => {
    console.log(`[Player Error] ${error.message}`);
    const ch = queue?.metadata?.channel;
    if (ch) ch.send(`❌ Player error: ${error.message}`).catch(() => {});
});

player.events.on('playerError', (queue, error) => {
    console.log(`[Track Error] ${error.message}`);
    const ch = queue?.metadata?.channel;
    if (ch) ch.send(`❌ Could not play this track: ${error.message}`).catch(() => {});
});

player.events.on('playerStart', (queue, track) => {
    const ch = queue?.metadata?.channel;
    if (ch) ch.send(`▶️ Now playing: **${track.title}** — ${track.author}`).catch(() => {});
});

player.events.on('emptyQueue', (queue) => {
    const ch = queue?.metadata?.channel;
    if (ch) ch.send(`✅ Queue finished! Add more songs with \`${PREFIX}play\``).catch(() => {});
});

// -------------------------
// Helper: detect if query is a URL
// -------------------------
function isURL(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

// -------------------------
// Message handler
// -------------------------
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // -------------------------
    // !play
    // -------------------------
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Please provide a search term or URL!');

        const voiceChannel = message.member?.voice?.channel;
        if (!voiceChannel) return message.reply('❌ You must be in a voice channel!');

        const perms = voiceChannel.permissionsFor(message.guild.members.me);
        if (!perms.has('Connect') || !perms.has('Speak')) {
            return message.reply('❌ I don\'t have permission to join or speak in your voice channel!');
        }

        try {
            let queue = player.nodes.get(message.guild.id);

            if (!queue || !queue.connection) {
                if (queue) queue.delete();

                queue = player.nodes.create(message.guild, {
                    metadata: { channel: message.channel },
                    selfDeaf: true,
                    volume: 80,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000
                });

                await queue.connect(voiceChannel);
            }

            // URLs are auto-detected, search terms use SoundCloud (YouTube blocks bots)
            const searchResult = await player.search(query, {
                requestedBy: message.author,
                searchEngine: isURL(query) ? QueryType.AUTO : QueryType.SOUNDCLOUD_SEARCH
            });

            if (!searchResult?.tracks?.length) {
                return message.reply('❌ No results found! Try a different search term or a direct URL.');
            }

            if (searchResult.playlist) {
                queue.addTrack(searchResult.tracks);
                message.reply(`📃 Added playlist: **${searchResult.playlist.title}** (${searchResult.tracks.length} tracks)`);
            } else {
                queue.addTrack(searchResult.tracks[0]);
                message.reply(`🎵 Added to queue: **${searchResult.tracks[0].title}**`);
            }

            if (!queue.isPlaying()) {
                await queue.node.play();
            }

        } catch (err) {
            console.error('Play error:', err);
            if (err.message.includes('Sign in to confirm') || err.message.includes('age')) {
                message.reply('❌ This video has age restrictions. Try a different video!');
            } else if (err.message.includes('Video unavailable')) {
                message.reply('❌ This video is unavailable. Try searching for it differently!');
            } else {
                message.reply(`❌ Could not play the song. Try a different search term or URL.\nError: ${err.message}`);
            }
        }
    }

    // -------------------------
    // !skip
    // -------------------------
    if (command === 'skip') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Nothing is playing!');
        queue.node.skip();
        message.reply('⏭️ Skipped!');
    }

    // -------------------------
    // !stop
    // -------------------------
    if (command === 'stop') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply('❌ Nothing is playing!');
        queue.node.stop();
        queue.delete();
        message.reply('⏹️ Stopped and cleared queue!');
    }

    // -------------------------
    // !queue
    // -------------------------
    if (command === 'queue') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.currentTrack) return message.reply('❌ Nothing is playing!');

        const current = queue.currentTrack;
        const tracks = queue.tracks.toArray().slice(0, 10);

        let queueString = `🎵 **Now Playing:**\n${current.title} — ${current.author}\n\n`;
        if (tracks.length > 0) {
            queueString += `**Up Next:**\n`;
            tracks.forEach((track, i) => {
                queueString += `${i + 1}. ${track.title} — ${track.author}\n`;
            });
        }

        message.reply(queueString);
    }

    // -------------------------
    // !pause
    // -------------------------
    if (command === 'pause') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Nothing is playing!');
        queue.node.pause();
        message.reply('⏸️ Paused!');
    }

    // -------------------------
    // !resume
    // -------------------------
    if (command === 'resume') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply('❌ Nothing is playing!');
        queue.node.resume();
        message.reply('▶️ Resumed!');
    }

    // -------------------------
    // !volume
    // -------------------------
    if (command === 'volume') {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply('❌ Nothing is playing!');

        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 100) {
            return message.reply(`🔊 Current volume: **${queue.node.volume}%**\nUse \`${PREFIX}volume <0-100>\` to change it.`);
        }
        queue.node.setVolume(vol);
        message.reply(`🔊 Volume set to **${vol}%**`);
    }

    // -------------------------
    // !help / !cmd / !commands
    // -------------------------
    if (command === 'help' || command === 'cmd' || command === 'commands') {
        message.reply(`
🎵 **Music Bot Commands** 🎵

\`${PREFIX}play <song name or URL>\` - Play a song or add it to queue, Please use soundcloud urls or search terms (YouTube blocks bots)
\`${PREFIX}skip\` - Skip the current song
\`${PREFIX}stop\` - Stop playing and clear the queue
\`${PREFIX}queue\` - Show the current queue
\`${PREFIX}pause\` - Pause the current song
\`${PREFIX}resume\` - Resume playback
\`${PREFIX}volume [0-100]\` - Check or set the volume
\`${PREFIX}ping\` - Check if the bot is responsive
\`${PREFIX}help\` - Show this message
        `);
    }

    // -------------------------
    // !ping
    // -------------------------
    if (command === 'ping') {
        message.reply(`🏓 Pong! Latency: ${client.ws.ping}ms`);
    }
});

// -------------------------
// Crash guard
// -------------------------
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// -------------------------
// Login
// -------------------------
client.login(config.token);