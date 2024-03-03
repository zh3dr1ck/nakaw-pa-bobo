const axios = require("axios");
const fs = require("fs-extra");
const os = require("os");
const yts = require("yt-search");
const ytdl = require("@neoxr/ytdl-core");

module.exports = {
  sentMusic: [],

  config: {
    name: "opm",
    version: "2.0",
    role: 0,
    author: "coffee",
    cooldowns: 40,
    shortDescription: "Fetch a random music song of axix band",
    longDescription: "Fetch a random music song of axix band",
    category: "music",
    dependencies: {
      "fs-extra": "",
      "axios": "",
      "@neoxr/ytdl-core": "",
      "yt-search": ""
    }
  },

  onStart: async function ({ api, event, message }) {
    try {
      const loadingMessage = await api.sendMessage("🕰 | Fetching music...", event.threadID, null, event.messageID);
      const apiKey = "AIzaSyAO1tuGus4-S8RJID51f8WJAM7LXz1tVNc";
      const playlistIds = [
        "PL5D7fjEEs5yey-zZ1CnOfsyp4SvM7-SIX&si=oJsU9gpmdssTuQ-C",
        "PLWEEt0QgQFInR8b2_sKk86VAGhLs_Iczf&si=KHZOQMcAJac-QcqE"
      ];
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&part=contentDetails&maxResults=50&playlistId=${playlistIds.join(',')}`;
      const response = await axios.get(playlistUrl);
      const videoIds = response.data.items.map(item => item.contentDetails.videoId);

      if (this.sentMusic.length === videoIds.length) {
        this.sentMusic = [];
      }

      const unwatchedVideoIds = videoIds.filter(videoId => !this.sentMusic.includes(videoId));

      if (unwatchedVideoIds.length === 0) {
        api.unsendMessage(loadingMessage.messageID);
        return api.sendMessage("No unwatched music tracks left.", event.threadID, null, event.messageID);
      }

      const randomVideoId = unwatchedVideoIds[Math.floor(Math.random() * unwatchedVideoIds.length)];
      this.sentMusic.push(randomVideoId);

      const videoDetails = await ytdl.getInfo(randomVideoId, { quality: 'highestaudio' });
      const randomMusicTitle = videoDetails.videoDetails.title;

      const searchResults = await yts(randomMusicTitle);
      if (!searchResults.videos.length) {
        api.unsendMessage(loadingMessage.messageID);
        return api.sendMessage("No music track found based on title.", event.threadID, null, event.messageID);
      }

      const foundVideo = searchResults.videos[0];
      const videoUrl = foundVideo.url;

      const stream = ytdl(videoUrl, { filter: "audioonly" });
      const fileName = `${randomMusicTitle}.mp3`;
      const filePath = `${os.tmpdir()}/${fileName}`;

      stream.on('info', info => {
        console.info('[DOWNLOADER]', `Downloading music: ${info.videoDetails.title}`);
      });

      stream.pipe(fs.createWriteStream(filePath));

      stream.on('end', async () => {
        console.info('[DOWNLOADER]', 'Downloaded');
        if (fs.statSync(filePath).size > 26214400) {
          fs.unlinkSync(filePath);
          api.unsendMessage(loadingMessage.messageID);
          return api.sendMessage('🚫 | The file could not be sent because it is larger than 25MB.', event.threadID, null, event.messageID);
        }

        const message = {
          body: `🎧 | Title: ${randomMusicTitle}`,
          attachment: fs.createReadStream(filePath)
        };

        api.sendMessage(message, event.threadID, null, event.messageID, () => {
          fs.unlinkSync(filePath);
          api.unsendMessage(loadingMessage.messageID);
        });
      });
    } catch (error) {
      console.error('[ERROR]', error);
      api.sendMessage('An error occurred while processing the command.', event.threadID, null, event.messageID);
    }
  },
};