const { Client, MessageEmbed } = require('discord.js');
const { prefix, token } = require('./config.json');
const ytdl = require("ytdl-core-discord");
const search = require('yt-search');
const { spawn } = require('child_process');
let request = require(`request`);
let fs = require(`fs`);

const client = new Client();
let servers = new Map();

client.login(token);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.author.id == '812433186293415957'){
    let ServerMedia = servers.get(msg.guild.id);
    if(ServerMedia){
      if(ServerMedia.isPlaying){
        ServerMedia.cleanup.push(msg);
      }
    }
  }

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
    let helpOut = 
    "**play**: Plays a song based on keywords or a youtube link\n\n" +
    "**skip**: Skips the current song\n\n" +
    "**stop/leave**: Stops playing music and disconnects\n\n" +
    "**pause**: Pauses the current song\n\n" +
    "**resume**: Resumes the current song\n\n" +
    "**queue**: Lists the songs currently in queue\n\n" +
    "**volume**: Sets the volume between 1 and 10\n\n" +
    "**echoN**: Echos your message N times\n\n";

    const embed = new MessageEmbed()
      .setTitle('List of Commands')
      .setColor('#0000000')
      .setDescription(helpOut);
    msg.channel.send(embed);
  }

  if (msg.content.startsWith(`${prefix}collage`)) {
    //if (msg.attachments.first()) {
    let small_images_urls = get_image_urls(body);
    console.log(small_images_urls)


    // let img_path;
    // for (let i = 0; i < 150; i++) {
    //   img_path = 'images/source_images/source_img_' + i + '.png';
    //   download(img_path, small_images_urls[i]);
  }

  //}

  
  // if (msg.content.startsWith(`${prefix}test`)) {

  //   gis('cats', logResults);

  //   function logResults(error, results) {
  //     if (error) {
  //       console.log(error);
  //     }
  //     else {
  //       console.log(JSON.stringify(results, null, '  '));
  //     }
  //   }
  // }

  if (msg.content.startsWith(`${prefix}minecraft`)) {
    if (msg.attachments.first()) {
      let pic_path = ".\\images\\pic_" + msg.channel.id + ".png";
      download(msg.attachments.first().url, pic_path);
      console.log('Image downloaded!');
      let kernal_size = 10;
      if (!body.startsWith(`${prefix}`))
        kernal_size = parseInt(body);

      const python = spawn('python3', ["minecraft.py", pic_path, msg.channel.id, kernal_size]);
      python.stderr.on('data', function (data) {
        console.error(data.toString());
      });
      python.on('close', (code) => {
        console.log(`Python Minecraft script closed with code: ${code}`);
        if (code != 0) {
          const embed = new MessageEmbed()
            .setTitle('Conversion failed! :(')
            .setColor('#0000000');
          return msg.channel.send(embed);

        }
        msg.channel.send({ files: ['./images/pic_' + msg.channel.id + '_out.png'] }).then(() => {
          try {
            fs.unlink(pic_path, (err) => {
              if (err) {
                console.error(err)
                return
              }
            });
            fs.unlink('./images/pic_' + msg.channel.id + '_out.png', (err) => {
              if (err) {
                console.error(err)
                return
              }
            });
          } catch (error) { }
        });
      });
    }
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
        isPaused: false,
        songs: [],
        volume: 5,
        voiceChannel: null,
        connection: null,
        guildId: msg.guild.id,
        msgChannel: msg.channel,
        cleanup: []
      };
      servers.set(msg.guild.id, ServerMedia);
    }
    ServerMedia.msgChannel = msg.channel;
    ServerMedia.cleanup.push(msg);

    let connection;
    await voiceChannel.join().then(newConnection => {
      connection = newConnection;
      ServerMedia.voiceChannel = voiceChannel;
      ServerMedia.connection = connection;
    })

    if (body.startsWith('https://www.youtube.com/watch?v=') || body.startsWith('https://music.youtube.com/watch?v=') || body.startsWith('https://youtu.be/')) {

      const results = await ytdl.getInfo(body, { type: 'video' });

      let musicStructure = {
        vidID: results.videoDetails.videoId,
        title: results.videoDetails.title,
        channel: results.videoDetails.author.name,
        link: body,
        thumbnail: results.videoDetails.thumbnails[0].url
      }

      console.log('Video Found!: ' + musicStructure.link);
      console.log('Video ID: ' + musicStructure.vidID);

      await addMusic(musicStructure, msg, ServerMedia);
    }

    else {
      console.log('Search Params Detected: ' + body);

      const result = await search(body);

      let i = 0;
      while (result.all[i].type != 'video') { i++; }

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
    let ServerMedia = servers.get(msg.guild.id);
    ServerMedia.cleanup.push(msg);
    skip(msg.guild.id);
  }

  if (msg.content.startsWith(`${prefix}stop`)) {
    if (!msg.member.voice.channel) {
      const embed = new MessageEmbed().setTitle('You have to be in a voice channel to stop music!').setColor('#0000000');
      return msg.channel.send(embed);
    }
    let ServerMedia = servers.get(msg.guild.id);
    ServerMedia.cleanup.push(msg);
    stop(msg.guild.id);
  }

  if (msg.content.startsWith(`${prefix}leave`)) {
    let ServerMedia = servers.get(msg.guild.id);
    ServerMedia.cleanup.push(msg);
    stop(msg.guild.id);
  }

  if (msg.content.startsWith(`${prefix}volume`)) {
    let ServerMedia = servers.get(msg.guild.id);
    ServerMedia.msgChannel = msg.channel;
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
    ServerMedia.msgChannel = msg.channel;
    ServerMedia.cleanup.push(msg);

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

  if (msg.content.startsWith(`${prefix}pause`)) {
    let ServerMedia = servers.get(msg.guild.id);
    ServerMedia.msgChannel = msg.channel;
    ServerMedia.cleanup.push(msg);

    if (ServerMedia.isPlaying) {
      if (!ServerMedia.isPaused) {
        ServerMedia.isPaused = true;
        const embed = new MessageEmbed().setTitle('Song paused!').setColor('#0000000');
        ServerMedia.msgChannel.send(embed);
        ServerMedia.connection.dispatcher.pause();
      }
      else {
        const embed = new MessageEmbed().setTitle('Song is already paused!').setColor('#0000000');
        return msg.channel.send(embed);
      }
    }
    else {
      const embed = new MessageEmbed().setTitle('Cannot pause a song that is not playing!').setColor('#0000000');
      return msg.channel.send(embed);
    }
  }

  if (msg.content.startsWith(`${prefix}resume`)) {
    let ServerMedia = servers.get(msg.guild.id);
    ServerMedia.msgChannel = msg.channel;
    ServerMedia.cleanup.push(msg);

    if (ServerMedia.isPlaying) {
      if (ServerMedia.isPaused) {
        ServerMedia.isPaused = false;
        const embed = new MessageEmbed().setTitle('Resuming song!').setColor('#0000000');
        ServerMedia.msgChannel.send(embed);
        ServerMedia.connection.dispatcher.resume();
      }

      else {
        const embed = new MessageEmbed().setTitle('Song is already playing!').setColor('#0000000');
        return msg.channel.send(embed);
      }
    }

    else {
      const embed = new MessageEmbed().setTitle('Cannot resume a song that is not playing!').setColor('#0000000');
      return msg.channel.send(embed);
    }
  }

   /* TODO:
   * + Playlists
   * + Queue Logic (Shuffle, Repeat)
   */
}


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
      .setTitle('Added Song to Queue: '+ musicStructure.title)
      .setColor('#0000000')
      .setDescription('by ' + musicStructure.channel + '\n' + musicStructure.link).setThumbnail(musicStructure.thumbnail);

    msg.channel.send(embed);
    servers.set(msg.guild.id, ServerMedia);
  }
}

async function play(guildId) {
  let ServerMedia = servers.get(guildId);

  let currentSong = ServerMedia.songs.shift();
  const embed = new MessageEmbed()
    .setTitle('Now Playing: ' + currentSong.title)
    .setColor('#0000000')
    .setDescription('by ' + currentSong.channel + '\n' + currentSong.link)
    .setThumbnail(currentSong.thumbnail);
  ServerMedia.msgChannel.send(embed);

  ServerMedia.isPlaying = true;
  ServerMedia.connection.play(await ytdl(currentSong.vidID, { filter: 'audioonly', quality: 'highestaudio'}), { seek: 0, type: 'opus', bitrate: 'auto', highestWaterMark: 1<<25})
    .on('finish', () => {
      if (ServerMedia.songs.length != 0) {
        console.log('Done playing, playing next song!');
        servers.set(guildId, ServerMedia);
        play(guildId);
      }
      else {
        console.log('Done playing, leaving!')
        ServerMedia.voiceChannel.leave();
        ServerMedia.isPlaying = false;
        cleanupMessages(ServerMedia.cleanup);
        ServerMedia.cleanup = [];
        servers.set(guildId, ServerMedia);
        return;
      }
    }).setVolumeLogarithmic(ServerMedia.volume / 5);
}

function skip(guildId) {
  let ServerMedia = servers.get(guildId);
  if (ServerMedia.isPlaying) {
    if(ServerMedia.isPaused){
      const embed = new MessageEmbed().setTitle('Resume the song before skipping!').setColor('#0000000');
      return ServerMedia.msgChannel.send(embed);
    }
    servers.set(guildId, ServerMedia);
    ServerMedia.connection.dispatcher.end();
  }
  else{
    const embed = new MessageEmbed().setTitle('There is no song to skip!').setColor('#0000000');
    return ServerMedia.msgChannel.send(embed);
  }
}

function stop(guildId) {
  let ServerMedia = servers.get(guildId);
  if (ServerMedia.isPlaying) {
    ServerMedia.isPlaying = false;
    ServerMedia.songs = [];
    if(ServerMedia.isPaused){
      ServerMedia.connection.dispatcher.resume();
      ServerMedia.isPaused = false;
    }
    servers.set(guildId, ServerMedia);
    ServerMedia.connection.dispatcher.end();
    ServerMedia.voiceChannel.leave();
  }
}

function cleanupMessages(cleanupArray){
  cleanupArray.forEach((msg)=>{
    msg.delete();
  })
}

async function download(url, pic_path) {
  request.get(url)
    .on('error', console.error)
    .pipe(fs.createWriteStream(pic_path));
}

function get_image_urls(search_term) {
  let small_images_urls = [];
  for (let i = 1; i < 2; i++) {
    searchImages.search(search_term, { page: i }).then(images => {
      for (let j = 0; j < 10; j++) {
        small_images_urls[((i - 1) * 10) + j] = images[j].thumbnail.url;
      }
    });
  }
  console.log(small_images_urls)
  return small_images_urls;
}
