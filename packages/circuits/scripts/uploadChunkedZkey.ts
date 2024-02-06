import { readFileSync } from 'fs'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import pako from 'pako'
import path from 'path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config()

const enum Buckets {
  prod = '',
  staging = '-staging',
  test = '-test',
}

// S3 config
const s3 = new S3Client({
  region: 'eu-west-3',
})

// Set destination
const bucketName = `anon-aadhaar${Buckets.staging}`
const folder_tag = 'v1.0.0'

const main = async () => {
  // TODO
  // Change the way we target zkey to chunk
  const zkeyData = readFileSync(
    path.join(__dirname, '../artifacts', 'circuit_final.zkey'),
  )

  let i = 0
  let chunkSize: number
  let count = 0

  while (i < zkeyData.length) {
    i === 0
      ? (chunkSize = Math.floor(zkeyData.length / 10) + (zkeyData.length % 10))
      : (chunkSize = Math.floor(zkeyData.length / 10))
    const chunkCompressed = pako.gzip(zkeyData.subarray(i, i + chunkSize))

    const keyName = `${folder_tag}/chunked_zkey/circuit_final_${count}.gz`

    // Upload the chunk to S3
    try {
      const parallelUploads3 = new Upload({
        client: s3,
        params: {
          Bucket: bucketName,
          Key: keyName,
          Body: chunkCompressed,
          ContentType: 'application/gzip',
        },
      })

      parallelUploads3.on('httpUploadProgress', progress => {
        console.log(progress)
      })

      await parallelUploads3.done()
      console.log(`Successfully uploaded ${keyName}`)
    } catch (err) {
      console.log('Error', err)
    }

    i += chunkSize
    count++
  }
}

main()
