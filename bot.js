const { Client, MessageEmbed } = require('discord.js');
const { prefix, token } = require('./config.json');
const ytdl = require("ytdl-core-discord");
const search = require('yt-search')

const client = new Client();
let servers = new Map();

client.login(token);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (!msg.author.bot && msg.content[0] == `${prefix}`) {
    processUserMessage(msg);
  }
});

async function processUserMessage(msg) {

  let body = msg.content.substring(msg.content.indexOf(' ') + 1, msg.content.length);
  while (body.startsWith(' ')) {
    body = body.substring(1, msg.content.length);
  }

  if (msg.content.startsWith(`${prefix}echo`)) {
    let num = 1;

    if (msg.content.substring(1, msg.content.indexOf(" ")) != 'echo') {
      let i = msg.content.substring(msg.content.indexOf('o') + 1, msg.content.indexOf(" "));
      num = parseInt(i);
    }

    for (let j = 0; j < num; j++)
      msg.channel.send(body);
  }

  if (msg.content.startsWith(`${prefix}help`)) {
    let helpOut = "Echo: Echo your message\n\n" + "Come: Come\n\nLeave: Leave";
    const embed = new MessageEmbed()
      .setTitle('List of Commands')
      .setColor('#0000000')
      .setDescription(helpOut);
    msg.channel.send(embed);
  }

  if (msg.content.startsWith(`${prefix}play`)) {
    const voiceChannel = msg.member.voice.channel;

    if (!voiceChannel) {
      const embed = new MessageEmbed().setTitle('You need to be in a voice channel before playing music!').setColor('#0000000');
      return msg.channel.send(embed);
    }

    let voicePermissions = voiceChannel.permissionsFor(msg.client.user);
    if (!voicePermissions.has("CONNECT") || !voicePermissions.has("SPEAK")) {
      const embed = new MessageEmbed().setTitle('I need permissions to join and speak in your voice channel!').setColor('#0000000');
      return msg.channel.send(embed);
    }

    let ServerMedia = servers.get(msg.guild.id);
    if (!ServerMedia) {
      ServerMedia = {
        isPlaying: false,
        songs: [],
        volume: 5,
        voiceChannel: null,
        connection: null,
        guildId: msg.guild.id,
        msgChannel: msg.channel
      };
      servers.set(msg.guild.id, ServerMedia);
    }

    let connection;
    await voiceChannel.join().then(newConnection => {
      connection = newConnection;

      ServerMedia.voiceChannel = voiceChannel;
      ServerMedia.connection = connection;
    })

    if (body.startsWith('https://www.youtube.com/watch?v=') || body.startsWith('https://music.youtube.com/watch?v=')) {
      let vidID = body.substring(body.indexOf('=') + 1, body.length);
      console.log('Video Link Detected: ', body);
      console.log('vidID = ' + vidID);
      const results = await ytdl.getInfo(body, { type: 'video' });

      let musicStructure = {
        vidID: vidID,
        title: results.videoDetails.title,
        channel: results.videoDetails.author.name,
        link: body,
        thumbnail: results.videoDetails.thumbnails[0].url
      }
      await addMusic(musicStructure, msg, ServerMedia);
    }

    else {
      console.log('Search Params Detected: ' + body);

      const result = await search(body);

      let i = 0;
      while(result.all[i].type != 'video')
        i++;

      musicStructure = {
        vidID: result.all[i].videoId,
        title: result.all[i].title,
        channel: result.all[i].author.name,
        link: result.all[i].url,
        thumbnail: result.all[i].thumbnail
      }

      console.log('Video Found!: ' + musicStructure.link);
      console.log('Video ID: ' + musicStructure.vidID);
      servers.set(msg.guild.id, ServerMedia);

      addMusic(musicStructure, msg, ServerMedia);
    }
  }


  if (msg.content.startsWith(`${prefix}skip`)) {
    if (!msg.member.voice.channel) {
      const embed = new MessageEmbed().setTitle('You have to be in a voice channel to skip music!').setColor('#00000000');
      return msg.channel.send(embed);
    }
    skip(msg.guild.id);
  }

  if (msg.content.startsWith(`${prefix}stop`)) {
    if (!msg.member.voice.channel) {
      const embed = new MessageEmbed().setTitle('You have to be in a voice channel to stop music!').setColor('#0000000');
      return msg.channel.send(embed);
    }
    stop(msg.guild.id);
  }

  if (msg.content.startsWith(`${prefix}leave`)) {
    stop(msg.guild.id);
  }

  if (msg.content.startsWith(`${prefix}volume`)) {
    let ServerMedia = servers.get(msg.guild.id);
    let newVolume = parseInt(body);

    if (!ServerMedia) {
      const embed = new MessageEmbed().setTitle('Play a song first to set the volume!').setColor('#0000000');
      return msg.channel.send(embed);
    }

    if (newVolume >= 0 && newVolume < 11) {
      ServerMedia.volume = newVolume;
      servers.set(msg.guild.id, ServerMedia);
      const embed = new MessageEmbed().setTitle('Volume set to ' + body + "!").setColor('#0000000').setDescription("(New volume will take effect starting with the next song.)");
      return msg.channel.send(embed);
    }
    else {
      const embed = new MessageEmbed().setTitle('Volume must be between 0 and 10!').setColor('#0000000');
      return msg.channel.send(embed);
    }
  }

  if (msg.content.startsWith(`${prefix}queue`)) {
    let ServerMedia = servers.get(msg.guild.id);

    if (ServerMedia.songs.length > 0) {
      let queueList = "";
      ServerMedia.songs.forEach((song, i) => {
        queueList = queueList + (i + 1) + ". " + song.title + " by " + song.channel + "\n";
      })
      const embed = new MessageEmbed().setTitle('Song Queue').setColor('#0000000').setDescription(queueList);
      return msg.channel.send(embed);
    }
    else {
      const embed = new MessageEmbed().setTitle('No songs in queue!').setColor('#0000000');
      return msg.channel.send(embed);
    }
  }

  //TODO
  // if (msg.content.startsWith(`${prefix}pause`)) {
  //   let ServerMedia = servers.get(msg.guild.id);
  //   if (ServerMedia.isPlaying)
  //     ServerMedia.connection.dispatcher.pause();
  // }

  // if (msg.content.startsWith(`${prefix}resume`)) {
  //   let ServerMedia = servers.get(msg.guild.id);
  //   if (ServerMedia.isPlaying)
  //     ServerMedia.connection.dispatcher.resume();
  // }

  /**
   * TODO:
   * + Playlists
   * + Queue Logic (Shuffle, Repeat)
   * 
   */
}


//===================  Helper Functions  =======================//
async function addMusic(musicStructure, msg, ServerMedia) {
  const results = await ytdl.getInfo(musicStructure.link, { type: 'video' });
  if (results.videoDetails.isLiveContent) {
    const embed = new MessageEmbed().setTitle('Sorry, I am not able to play livestreams. Try a different search term!').setColor('#0000000');
    return msg.channel.send(embed);
  }

  ServerMedia.songs.push(musicStructure);
  if (!ServerMedia.isPlaying) {
    servers.set(msg.guild.id, ServerMedia);
    play(msg.guild.id);
  }
  else {
    const embed = new MessageEmbed()
      .setTitle('Added Song to Queue')
      .setColor('#0000000')
      .setDescription(musicStructure.title + '\nby ' + musicStructure.channel + '\n' + musicStructure.link).setThumbnail(musicStructure.thumbnail);

    msg.channel.send(embed);
    servers.set(msg.guild.id, ServerMedia);
  }
}

async function play(guildId) {
  let ServerMedia = servers.get(guildId);

  let currentSong = ServerMedia.songs.shift();
  const embed = new MessageEmbed()
    .setTitle('Now playing: ' + currentSong.title)
    .setColor('#0000000')
    .setDescription('by ' + currentSong.channel + '\n' + currentSong.link)
    .setThumbnail(currentSong.thumbnail);
  ServerMedia.msgChannel.send(embed);

  ServerMedia.isPlaying = true;
  ServerMedia.connection.play(await ytdl(currentSong.vidID, { filter: 'audioonly', quality: 'highestaudio' }), { seek: 0, volume: 1, type: 'opus', bitrate: 'auto' })
    .on('finish', () => {
      if (ServerMedia.songs.length != 0) {
        console.log('Done playing, playing next song!');
        play(guildId);
      }
      else {
        console.log('Done playing, no next song and leaving!')
        ServerMedia.voiceChannel.leave();
        ServerMedia.isPlaying = false;
        servers.set(guildId, ServerMedia);
        return;
      }
    }).setVolumeLogarithmic(ServerMedia.volume / 5);
}

function skip(guildId) {
  let ServerMedia = servers.get(guildId);
  if (ServerMedia.isPlaying) {
    ServerMedia.connection.dispatcher.end();
  }
}

function stop(guildId) {
  let ServerMedia = servers.get(guildId);
  if (ServerMedia.isPlaying) {
    ServerMedia.isPlaying = false;
    ServerMedia.songs = [];
    ServerMedia.connection.dispatcher.end();
    ServerMedia.voiceChannel.leave();
    servers.set(guildId, ServerMedia);
  }
}