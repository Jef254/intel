/*
---------------------------------------------------------
Spy Initialization
---------------------------------------------------------
*/

var pm2 = require('pm2');
var btoa = require('btoa');
const { shiphold } = require("ship-hold");

const sh = shiphold({
    host: "intel-postgres",
    //user: process.env.POSTGRES_USER,
    //password: process.env.POSTGRES_PASSWORD,
    user: "postgres",
    password: "changeme",
    database: "relay",
    port: 5432
});

(async () => {
    let processConfiguration = await sh
        .select("name")
        .from("spies")
        .where("enabled", "TRUE")
        .run();
    processConfiguration.map(function (v) {
        v.script = "spy.js";
        v.env = {};
    });

    for (let process of processConfiguration) {
        let eachSpyConfig = await sh
            .select("spy_id", "token", "name")
            .from("spies")
            .where("name", process.name)
            .run();
        eachSpyConfig = Object.assign({}, ...eachSpyConfig);

        eachSpyConfig.channels = await sh
            .select("name", "source", "destination", "translate", "color")
            .from("channels")
            .where("enabled", "TRUE")
            .and("spy_id", eachSpyConfig.spy_id)
            .run();

        let encodedConfig = btoa(JSON.stringify(eachSpyConfig));

        let spy = processConfiguration.find(
            spy => spy.name == eachSpyConfig.name
        );

        spy.env.JSON_CONFIG = encodedConfig;
    }

    await spyStart(processConfiguration);
})();

async function spyStart(config) {
    pm2.connect(function (error) {
        if (error) {
            console.error(error);
            process.exit(2);
        }

        pm2.list(function (error, list) {
            if (error) throw error;

            let missingArray = config.filter(v => {
                return list.map(v => v.name).indexOf(v.name) == -1;
            });

            pm2.start(missingArray, function (error, apps) {
                if (error) throw error;
                pm2.disconnect();
            });
        });
    });
}
console.log("Spies starting!");

async function spyRestart(spyName) {
    pm2.connect(function (error) {
        if (error) {
            console.error(error);
            process.exit(2);
        }
        pm2.restart(spyName, function(error) {
            if (error) throw error;
        });
    });
}

/*
---------------------------------------------------------
Server Configuration
---------------------------------------------------------
*/

const Discord = require("discord.js");
const server = new Discord.Client();
const config = require("./config.json");

server.on("ready", () => {
    console.log(
        `Server - Logged on as: ${server.user.tag} - ${server.user.id}`
    );
});

server.on("message", message => {
    if (!message.content.startsWith(config.prefix)) return;
    if (message.author.bot) return;
    if (!message.channel.type == "dm") return;
    if (!message.author.id == "111202303070969856") return;

    const args = message.content.slice(config.prefix.length).split(' ');
    const command = args.shift().toLowerCase();

    if (command === "args") {
        if (!args.length) return;
        console.log(`Command: ${command}`);
        console.log(`Arguments: ${args}`);
    } 
    
    else if (command === "embed") {
        
        let embed = new Discord.RichEmbed()
        .setTitle("Title :flag_us:")
        .setAuthor("Author :flag_us:")
        .setDescription("Description :flag_us:")
        .setTimestamp();

        message.channel.send({ embed: embed});
    }
});

server.login(config.token);
console.log("Discord bot initialized!")

/*
---------------------------------------------------------
RPC Server Configuration
---------------------------------------------------------
*/

const jayson = require('jayson');

const RPC = jayson.server({
    relay: function (args, callback) {
        relayMessage(args);
        callback();
    },

    ready: function (args, callback) {
        console.log(args.message);
        callback();
    },

    add: function (args, callback) {
        console.log(args.message);
        callback();
    },

    delete: function (args, callback) {
        console.log(args.message);
        callback();
    },

    restart: function (args, callback) {
        console.log(args.message);
        callback();
    },

    update: function (args, callback) {
        console.log(args.message);
        callback();
    }
});

RPC.http().listen(3000);
console.log("RPC server online!")

/*
---------------------------------------------------------
Relay Functions
---------------------------------------------------------
*/

const translate = require("@k3rn31p4nic/google-translate-api");

function translateCheck(check, text) {
    if (check) {
        return translate(text, { to: "en" })
            .then(res => {
                return res.text;
            })
            .catch(err => {
                console.error(err);
            });
    } else {
        return text;
    }
}

async function colorCheck(color, text) {
    if (/(CTA)/i.test(text)) {
        return "0xFF0000";
    } else {
        return color;
    }
}

var FIFO = [];

async function relayMessage(data) {
    if (!FIFO.includes(data.messageID)) {
        FIFO.unshift(data.messageID);
    } else return;

    if (FIFO.length > 100) {
        FIFO.pop();
    }

    let description = await translateCheck(
        data.destinationTranslation,
        data.messageContent
    );

    // let color = await colorCheck(data.destinationColor, description);

    let embed = new Discord.RichEmbed()
        .setTitle(data.destinationName)
        .setAuthor(data.authorName, data.authorIcon)
        .setDescription(description)
        .setTimestamp()
        // .setColor(color)
        .setColor(data.destinationColor)
        .setFooter(data.guildName, data.guildIcon);

    if (data.messageAttachments) {
        embed.setImage(data.messageAttachments);
    }

    if (data.destinationTranslation) {
        embed.addField("Original Text", data.messageContent);
    }
    
    if (data.destinationID != "611194478296039482") {
        broadcast({embed: embed});
    }

    server.channels
        .get(data.destinationID)
        .send({ embed: embed })
        .catch(console.error);
};

function broadcast(message) {
    server.guilds.map((guild) => {
        if (guild.id !== "611189043677626409") {
            guild.channels.map((c) => {
                if (c.type === "text" &&
                    c.name === "relay" &&
                    c.permissionsFor(server.user).has(["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"]) === true) {

                    c.send(message);
                }
            });
        }
    });
}

console.log("Relay functions set!")