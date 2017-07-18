/**
 * Created by thomasjeanneau on 16/07/2017.
 */

import _ from 'lodash'
import cron from 'cron'

import { bots } from './config'
import {
  getAllMembers,
  getIdFromName,
  saveMood
} from '../methods'

const { CronJob } = cron

const askMood = new CronJob({
  cronTime: '00 23 21 * * *',
  onTick: function () {
    _.forEach(bots, async (bot) => {
      const members = await getAllMembers(bot)
      _.forEach(members, ({ name, id }) => {
        console.log(name, id)
        if (name === 'thomas') {
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
                    text: `This is not a validate Mood, please try again :pray:`
                  }, 'default')
                  convo.repeat()
                }
                convo.next()
              }, { key: 'level' }, 'default')

              convo.addMessage({
                text: `Thanks for giving me your mood! :fire:`
              }, 'comments')

              convo.addQuestion({
                text: `If you have any feedback or explanation to add, please feel free to share it below. Otherwise, just say no.`
              }, (response, convo) => {
                convo.gotoThread('saved')
                convo.next()
              }, { key: 'comment' }, 'comments')

              convo.beforeThread('saved', async function (convo, next) {
                const id = await getIdFromName(name)
                const level = convo.extractResponse('level')
                const comment = convo.extractResponse('comment')
                await saveMood(id, level, comment)
                next()
              })

              convo.addMessage({
                text: `Awesome, it has been successfully saved! See you tomorrow, take care! :heart:`
              }, 'saved')

              convo.addMessage({
                text: `See you tomorrow, take care :heart:`
              }, 'saved')
            })
          } catch (e) {
            console.log(e)
            bot.reply({ user: id }, `Oops..! :sweat_smile: A little error occur: \`${e.message || e.error || e}\``)
          }
        }
      })
    })
  },
  start: false,
  timeZone: 'Europe/Paris'
})

const sendMood = new CronJob({
  cronTime: '00 00 19 * * *',
  onTick: function () {
    _.forEach(bots, async (bot) => {
      try {

      } catch (e) {
        console.log(e)
      }
    })
  },
  start: false,
  timeZone: 'Europe/Paris'
})

askMood.start()

sendMood.start()
