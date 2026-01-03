import api from './api'

export const uploadService = {
  async uploadArtifactImage(file: File): Promise<string> {
    // 1. Get presigned URL
    const { data } = await api.post('/api/admin/upload-url', {
      filename: file.name,
      contentType: file.type,
    })

    const { uploadUrl, imageUrl } = data

    // 2. Upload file to S3
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    // 3. Return public URL
    return imageUrl
  },
}
