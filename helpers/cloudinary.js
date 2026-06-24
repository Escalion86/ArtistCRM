import isObject from './isObject'

// export const deleteImage = async (publicId, resource_type = 'image') => {
//   try {
//     const res = await fetch('/api/cloudimages', {
//       method: 'DELETE',
//       // headers: {
//       //   Accept: contentType,
//       //   'Content-Type': contentType,
//       // },
//       body: JSON.stringify({ publicId, resource_type }),
//     })

//     // Throw error with status code in case Fetch API req failed
//     if (!res.ok) {
//       throw new Error(res.status)
//     }
//   } catch (error) {
//     // setMessage('Failed to update on ' + url)
//   }
// }

export const deleteImages = async (arrayOfImagesUrls, callback = null) => {
  // if (arrayOfImagesUrls.length > 0)
  //   await Promise.all(
  //     arrayOfImagesUrls.map(async (imageUrl) => {
  //       if (imageUrl.lastIndexOf(CLOUDINARY_FOLDER + '/') > 0) {
  //         await deleteImage(
  //           imageUrl.substring(
  //             imageUrl.lastIndexOf(CLOUDINARY_FOLDER + '/'),
  //             imageUrl.lastIndexOf('.')
  //           )
  //         )
  //       } else if (!imageUrl.includes('https://res.cloudinary.com')) {
  //         await deleteImage(CLOUDINARY_FOLDER + '/' + imageUrl)
  //       }
  //     })
  //   )
  if (callback) callback()
}

export const getImages = async (directory, callback, project = 'artistcrm') => {
  if (directory) {
    const query = {
      directory,
    }

    const queryString = new URLSearchParams(query).toString()
    const urlWithQuery = `https://cloud.escalion.ru/api/files?${project}/${queryString}`

    return await fetch(
      // 'https://api.cloudinary.com/v1_1/escalion-ru/image/upload',
      urlWithQuery,
      {
        method: 'GET',
        // body: formData,
        //  JSON.stringify({
        //   file: image,
        //   fileName: imageName ?? 'test.jpg',
        //   folder: 'events',
        // })
        // dataType: 'json',
        // headers: {
        //   'Content-Type': 'application/json',
        // 'Content-Type': "multipart/form-data"
        // },
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log('data', data)
        // if (data.secure_url !== '') {
        // if (callback) callback(data.secure_url)
        // return data.secure_url
        // }
        if (callback) callback(data)
        return data
      })
      .catch((err) => console.error('ERROR', err))
  }
}

const normalizeUploadResponseData = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return [data]
}

const uploadToEscalionCloud = async ({
  file,
  callback,
  folder,
  fileName = null,
  project = 'artistcrm',
  onError = null,
}) => {
  if (!isObject(file)) {
    if (onError) onError('Файл не выбран')
    return null
  }

  const normalizedProject =
    typeof project === 'string' ? project.trim() : String(project || '').trim()
  const normalizedFolder =
    typeof folder === 'string' ? folder.trim() : String(folder || '').trim()
  const directoryPath = `${normalizedProject || 'artistcrm'}/${normalizedFolder || 'temp'}`
  const formData = new FormData()

  formData.append('directory', directoryPath)
  formData.append('files', file)
  if (fileName) formData.append('fileName', fileName)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)
    const response = await fetch('/api/escalioncloud', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
    clearTimeout(timeoutId)

    const rawResponse = await response.text()
    let responseJson = null
    try {
      responseJson = rawResponse ? JSON.parse(rawResponse) : null
    } catch {
      responseJson = null
    }

    if (!responseJson) {
      if (onError)
        onError('Сервер вернул некорректный ответ при загрузке файла.')
      return null
    }

    if (!response.ok || !responseJson?.success) {
      const error =
        responseJson?.data?.error?.message ||
        responseJson?.message ||
        `Upload failed: ${response.status}`
      if (onError) onError(error)
      return null
    }

    const data = normalizeUploadResponseData(responseJson.data)
    if (callback) callback(data)
    return data
  } catch (err) {
    const message =
      err?.name === 'AbortError'
        ? 'Upload timeout'
        : err?.message || 'Upload failed'
    console.error('ERROR', err)
    if (onError) onError(message)
    return null
  }
}

export const sendImage = async (
  image,
  callback,
  folder,
  imageName = null,
  project = 'artistcrm',
  onError = null
) => {
  return uploadToEscalionCloud({
    file: image,
    callback,
    folder,
    fileName: imageName,
    project,
    onError,
  })
}

export const sendFile = async (
  file,
  callback,
  folder,
  fileName = null,
  project = 'artistcrm',
  onError = null
) => {
  return uploadToEscalionCloud({
    file,
    callback,
    folder,
    fileName,
    project,
    onError,
  })
}

// export const sendVideo = async (
//   video,
//   callback,
//   folder = null,
//   videoName = null
// ) => {
//   if (isObject(video)) {
//     const formData = new FormData()
//     formData.append('file', video)
//     formData.append(
//       'upload_preset',
//       folder ? CLOUDINARY_FOLDER + '_' + folder : CLOUDINARY_FOLDER
//     )
//     if (videoName) {
//       formData.append('public_id', videoName)
//     }

//     return await fetch(
//       'https://api.cloudinary.com/v1_1/escalion-ru/video/upload',
//       {
//         method: 'POST',
//         body: formData,
//       }
//     )
//       .then((response) => response.json())
//       .then((data) => {
//         if (data.secure_url !== '') {
//           if (callback) callback(data.secure_url)
//           return data.secure_url
//         }
//       })
//       .catch((err) => console.error('ERROR', err))
//   }
// }

// export const deleteVideo = async (publicId, resource_type = 'video') => {
//   // const { id } = router.query

//   try {
//     const res = await fetch('/api/cloudimages', {
//       method: 'DELETE',
//       // headers: {
//       //   Accept: contentType,
//       //   'Content-Type': contentType,
//       // },
//       body: JSON.stringify({ publicId, resource_type }),
//     })

//     if (!res.ok) {
//       throw new Error(res.status)
//     }
//     return res
//   } catch (error) {
//     return error
//     // setMessage('Failed to update on ' + url)
//   }
// }
