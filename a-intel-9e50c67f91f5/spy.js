/*
---------------------------------------------------------
Parsing Configuration
---------------------------------------------------------
*/

var atob = require('atob');
const config = JSON.parse(atob(process.env.JSON_CONFIG));

/*
---------------------------------------------------------
Spy Initialization
---------------------------------------------------------
*/

const Discord = require("discord.js");
const client = new Discord.Client();

client.on("ready", () => {
    console.log("Ready!");

    let data = {};
    data.message = `Client - Logged on as: ${client.user.tag} - ${client.user.id}`
    sendMessage('ready', data);
});

client.on("message", message => {
    let channel = config.channels.find(
        channel => channel.source === message.channel.id
    );

    if (channel) {
        let data = {
            guildID: message.guild.id,
            guildIcon: message.guild.iconURL,
            guildName: message.guild.name,

            channelID: message.channel.id,
            channelName: message.channel.name,

            authorName: message.member.displayName,
            authorIcon: message.author.displayAvatarURL,

            messageID: message.id,
            messageContent: message.content,

            destinationID: channel.destination,
            destinationColor: channel.color,
            destinationTranslation: channel.translate,
            destinationName: channel.name
        };

        if (message.attachments.array()[0]) {
            data.messageAttachments = message.attachments.array()[0].url;
        }

        sendMessage('relay', data);
    }
});

client.login(config.token);

/*
---------------------------------------------------------
Relay Functions
---------------------------------------------------------
*/

const jayson = require('jayson');

const RPC = jayson.client.http({
    port: 3000
});

function sendMessage(type, message) {
    RPC.request(type, message, function (err, response) {
        if (err) throw err;
    });
}