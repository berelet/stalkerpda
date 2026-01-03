import api from './api'

export const uploadService = {
  async uploadArtifactImage(file: File): Promise<string> {
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/png;base64, prefix
        const base64Data = result.split(',')[1]
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    // Upload through Lambda
    const { data } = await api.post('/api/admin/upload', {
      fileData: base64,
      filename: file.name,
      contentType: file.type,
    })

    return data.imageUrl
  },
}
