import Airtable from 'airtable'
import Promise from 'bluebird'

require('dotenv').config()

const {
  AIRTABLE_API_KEY,
  AIRTABLE_BASE_KEY
} = process.env

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_KEY) {
  console.log('Error: Specify AIRTABLE_API_KEY and AIRTABLE_BASE_KEY in a .env file')
  process.exit(1)
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: AIRTABLE_API_KEY
})

// reads all records from a table
export const _getAllRecords = (select) => {
  return new Promise((resolve, reject) => {
    let allRecords = []
    select.eachPage(function page (records, fetchNextPage) {
      allRecords = allRecords.concat(records)
      fetchNextPage()
    }, function done (err) {
      if (err) return reject(err)
      resolve(allRecords)
    })
  })
}

// allows accessing tables directly
export const base = Airtable.base(AIRTABLE_BASE_KEY)

export const getBase = async (teamId) => {
  const records = await _getAllRecords(base('Companies').select({
    view: 'Main view',
    filterByFormula: `{Team ID} = '${teamId}'`
  }))
  const baseKey = records[0].fields['Airtable Base']
  return Airtable.base(baseKey)
}
