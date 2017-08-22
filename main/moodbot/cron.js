/**
 * Created by thomasjeanneau on 16/07/2017.
 */

import _ from 'lodash'
import cron from 'cron'
import moment from 'moment'
import asyncForEach from 'async-foreach'

import { bots } from './config'
import {
  getAllMembers,
  getIdFromName,
  saveMood,
  getMoods,
  getMember,
  getEmoji,
  getColor,
  getAllChannels
} from '../methods'

require('dotenv').config()

const { CronJob } = cron
const { forEach } = asyncForEach

const askMood = new CronJob({
  cronTime: '00 00 15 * * *',
  onTick: function () {
    _.forEach(bots, async (bot) => {
      const members = await getAllMembers(bot)
      _.forEach(members, ({ name, id }) => {
        try {
          bot.startPrivateConversation({ user: id }, (err, convo) => {
            if (err) return console.log(err)

            convo.addMessage({
              text: `Hello ${name}! :smile:`
            }, 'default')

            convo.addQuestion({
              text: `What is your mood today on a scale from 1 to 10?`
            }, (response, convo) => {
              const mood = _.find([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], n => n === parseInt(response.text, 10))
              if (mood) {
                convo.gotoThread('comments')
              } else {
                convo.addMessage({
                  text: `Hum... :thinking_face:`
                }, 'default')
                convo.addMessage({
                  text: `This is not a validate mood, please try again :pray:`
                }, 'default')
                convo.repeat()
              }
              convo.next()
            }, { key: 'level' }, 'default')

            convo.addMessage({
              text: `Thanks for giving me your mood! :fire:`
            }, 'comments')

            convo.addQuestion({
              text: `If you want to add your status as well, please share it below. Otherwise, just say \`no\` to save your answer.`
            }, (response, convo) => {
              convo.gotoThread('saved')
              convo.next()
            }, { key: 'comment' }, 'comments')

            convo.beforeThread('saved', async function (convo, next) {
              const id = await getIdFromName(bot.config.id, name)
              const level = convo.extractResponse('level')
              const comment = convo.extractResponse('comment')
              await saveMood(bot.config.id, id, level, comment)
              next()
            })

            convo.addMessage({
              text: `Awesome, it has been successfully saved!`
            }, 'saved')

            convo.addMessage({
              text: `See you tomorrow, take care :heart:`
            }, 'saved')
          })
        } catch (e) {
          console.log(e)
          bot.reply({ user: id }, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
        }
      })
    })
  },
  start: false,
  timeZone: 'Europe/Paris'
})

const sendMood = new CronJob({
  cronTime: '00 20 18 * * *',
  onTick: function () {
    _.forEach(bots, async (bot) => {
      const channels = await getAllChannels(bot)
      _.forEach(channels, async ({ name, users }) => {
        try {
          const moods = await getMoods(bot.config.id, users)
          const attachments = []
          forEach(moods, async function (mood) {
            const done = this.async()
            const { fields: user } = await getMember(bot.config.id, mood['Member'][0])
            attachments.push({
              'title': `<${user['Slack Handle']}> is at ${mood['Level']}/10 ${getEmoji(mood['Level'])}`,
              'text': mood['Comment'],
              'color': getColor(mood['Level']),
              // TODO: add image from slack
              // 'thumb_url': user['Profile Picture'][0].url,
              'footer': moment(mood['Date']).format('MMM Do [at] h:mm A')
            })
            done()
          }, () => bot.say({
            'text': 'Hi dream team! Here is your mood daily digest :sparkles:',
            'channel': name,
            'attachments': attachments
          }, (err, res) => {
            console.log(err)
            console.log(res)
          }))
        } catch (e) {
          console.log(e)
          bot.reply({ user: name }, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
        }
      })
    })
  },
  start: false,
  timeZone: 'Europe/Paris'
})

askMood.start()
sendMood.start()
