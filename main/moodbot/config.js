/**
 * Created by thomasjeanneau on 08/02/2017.
 */

import localTunnel from 'localtunnel'
import Botkit from 'botkit'
import BotkitStorageMongo from 'botkit-storage-mongo'
import Promise from 'bluebird'

import { base } from '../airtable/index'

require('dotenv').config()

const bots = {}
const {
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  PORT,
  MONGODB_URI,
  NODE_ENV
} = process.env

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !PORT || !MONGODB_URI || !NODE_ENV) {
  console.log('Error: Specify SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, PORT and MONGO_URL in a .env file')
  process.exit(1)
}

if (NODE_ENV === 'DEVELOPMENT') {
  const tunnel = localTunnel(PORT, {subdomain: 'devmoodbot'}, (err, tunnel) => {
    if (err) console.log(err)
    console.log(`Bot running at the url: ${tunnel.url}`)
  })
  tunnel.on('close', () => {
    console.log('Tunnel is closed')
  })
}

const trackBot = (bot) => {
  bots[bot.config.token] = bot
}

const mongoStorage = new BotkitStorageMongo({
  mongoUri: MONGODB_URI
})

const controller = Botkit.slackbot({
  debug: false,
  interactive_replies: true,
  require_delivery: true,
  storage: mongoStorage
})

controller.configureSlackApp({
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  scopes: ['bot', 'chat:write:bot', 'users:read']
})

controller.setupWebserver(PORT, (err) => {
  if (err) return console.log(err)
  controller
    .createWebhookEndpoints(controller.webserver)
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver, (err, req, res) => {
      if (err) return res.status(500).send('ERROR: ' + err)
      res.send('Success!')
    })
})

controller.on('create_bot', async (bot, config) => {
  if (bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    const create = Promise.promisify(base('Companies').create)
    await create({
      'Name': bot.config.name,
      'Team ID': bot.config.id,
      'Created By': bot.config.createdBy,
      'Url': bot.config.url
    })
    bot.startRTM((err) => {
      if (!err) trackBot(bot)
      bot.startPrivateConversation({user: config.createdBy}, (err, convo) => {
        if (err) return console.log(err)
        convo.say('Hey! I am the <@moodbot> that has just joined your team :smile:')
        convo.say('You must now /invite me to a channel so that I can be of use!')
      })
    })
  }
})

controller.on('rtm_open', async (bot) => {
  console.log('** The RTM api just connected!')
})

controller.on('rtm_close', () => {
  console.log('** The RTM api just closed')
})

controller.storage.teams.all((err, teams) => {
  if (err) throw new Error(err)
  for (let t in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM((err, bot) => {
        if (err) return console.log('Error connecting moodbot to Slack:', err)
        trackBot(bot)
      })
    }
  }
})

export { controller, bots }
