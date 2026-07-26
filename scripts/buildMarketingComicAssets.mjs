import { mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = process.cwd()
const sourceRoot = path.resolve(projectRoot, '..', 'Контент')
const outputRoot = path.join(projectRoot, 'public', 'marketing', 'comics')

const comics = [
  { source: 'ArtistCRM_foc.png', slug: 'fokusniki' },
  { source: 'ArtistCRM_evt.png', slug: 'vedushchie' },
  { source: 'ArtistCRM_mus.png', slug: 'muzykanty' },
]

const columns = [
  { left: 0, width: 339 },
  { left: 340, width: 348 },
  { left: 689, width: 335 },
]
const rows = [
  { top: 0, height: 735 },
  { top: 736, height: 679 },
]
const singleThemes = [
  { name: 'zayavki', frame: 1 },
  { name: 'zadatki-i-dela', frame: 4 },
  { name: 'ai-chernovik', frame: 3 },
]

for (const comic of comics) {
  const sourcePath = path.join(sourceRoot, comic.source)
  const destination = path.join(outputRoot, comic.slug)
  await mkdir(path.join(destination, 'carousel'), { recursive: true })
  await mkdir(path.join(destination, 'ads'), { recursive: true })
  await mkdir(path.join(destination, 'video-frames'), { recursive: true })

  await sharp(sourcePath)
    .webp({ quality: 88 })
    .toFile(path.join(destination, 'poster.webp'))

  let frame = 1
  for (const row of rows) {
    for (const column of columns) {
      const cropped = sharp(sourcePath).extract({ ...column, ...row })
      const carouselPath = path.join(
        destination,
        'carousel',
        `${String(frame).padStart(2, '0')}.webp`
      )
      await cropped.clone().webp({ quality: 90 }).toFile(carouselPath)
      await cropped
        .clone()
        .resize(1080, 1920, {
          fit: 'contain',
          background: { r: 5, g: 7, b: 8 },
        })
        .jpeg({ quality: 91 })
        .toFile(
          path.join(
            destination,
            'video-frames',
            `${String(frame).padStart(2, '0')}.jpg`
          )
        )
      frame += 1
    }
  }

  for (const theme of singleThemes) {
    const sourceFrame = path.join(
      destination,
      'carousel',
      `${String(theme.frame).padStart(2, '0')}.webp`
    )
    await sharp(sourceFrame)
      .resize(1080, 1350, {
        fit: 'contain',
        background: { r: 5, g: 7, b: 8 },
      })
      .webp({ quality: 91 })
      .toFile(path.join(destination, 'ads', `${theme.name}.webp`))
  }

  const ffmpeg = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      '1/2.4',
      '-i',
      path.join(destination, 'video-frames', '%02d.jpg'),
      '-vf',
      'fade=t=in:st=0:d=0.25,fade=t=out:st=2.1:d=0.25,format=yuv420p',
      '-c:v',
      'libx264',
      '-r',
      '30',
      '-movflags',
      '+faststart',
      path.join(destination, 'comic-vertical.mp4'),
    ],
    { stdio: 'inherit' }
  )
  if (ffmpeg.status !== 0) {
    throw new Error(`ffmpeg завершился с кодом ${ffmpeg.status}`)
  }
  await rm(path.join(destination, 'video-frames'), {
    recursive: true,
    force: true,
  })
}

console.log(`Маркетинговые материалы собраны в ${outputRoot}`)
