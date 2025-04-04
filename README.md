# Discord Bot for Defang

This is a Discord bot developed for [Defang Software Labs](https://github.com/DefangLabs). It provides helpful resources in a Discord server and interacts with users via slash commands. The bot is built using Discord's official [template](https://github.com/discord/discord-example-app).

## Features

### Slash Commands

`/ask`: A command to ask Defang-related questions to the bot. The bot accesses the Ask Defang (ask.defang.io) API endpoint for retrieving responses.

`/test`: A basic command to test functionality using the Discord API, without relying on external APIs.

## Development

### Project structure

Below is a basic overview of the project structure:

```
├── .env.       -> .env file (not shown)
├── app.js      -> main entrypoint for app
├── commands.js -> slash command payloads + helpers
├── utils.js    -> utility functions and enums
├── package.json
├── README.md
└── .gitignore
```

### Setup project

Before you start, you'll need to install [NodeJS](https://nodejs.org/en/download/) and [create a Discord app](https://discord.com/developers/applications) with the proper permissions:

- `applications.commands`
- `bot` (with Send Messages enabled)
  Configuring the app is covered in detail in the [getting started guide](https://discord.com/developers/docs/getting-started).

### Install dependencies

```
cd discord-bot
npm install
```

### Get app credentials

Fetch the credentials from your app's settings and add them to a `.env` file. You'll need your app ID (`DISCORD_APP_ID`), bot token (`DISCORD_TOKEN`), and public key (`DISCORD_PUBLIC_KEY`).
You will also need an `ASK_TOKEN` to authenticate API calls to the Ask Defang endpoint.

### Install slash commands

The commands for the example app are set up in `commands.js`. All of the commands in the `ALL_COMMANDS` array at the bottom of `commands.js` will be installed when you run the `register` command configured in `package.json`:

```
cd discord-bot
npm run register
```

### Running the app locally

After your credentials are added, go ahead and run the app:

```
cd discord-bot
npm run start
```

### Set up interactivity

The project needs a public endpoint where Discord can send requests. To develop and test locally, you can use something like [`ngrok`](https://ngrok.com/) to tunnel HTTP traffic.

Install ngrok if you haven't already, then start listening on port `3000` in a separate terminal:

```
ngrok http 3000
```

You should see your connection open:

```
Tunnel Status                 online
Version                       2.0/2.0
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://1234-someurl.ngrok.io -> localhost:3000

Connections                  ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

Copy the forwarding address that starts with `https`, in this case `https://1234-someurl.ngrok.io`, then go to your [app's settings](https://discord.com/developers/applications).

On the **General Information** tab, there will be an **Interactions Endpoint URL**. Paste your ngrok address there, and append `/interactions` to it (`https://1234-someurl.ngrok.io/interactions` in the example).

Click **Save Changes**, and your app should be ready to run 🚀
