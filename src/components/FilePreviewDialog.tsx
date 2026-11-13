import { useState } from "react"
import { Button, Dialog } from "@/components/ui"
import { Icon } from "@/components/icons"

type FilePreviewDialogProps = {
  name: string
  url: string
  mimeType?: string | null
  onClose: () => void
}

export function FilePreviewDialog({ name, url, mimeType, onClose }: FilePreviewDialogProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const type = mimeType?.toLowerCase() || ""

  async function download() {
    setDownloading(true)
    setDownloadError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`)
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = name
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
    } catch (error) {
      setDownloadError(error instanceof Error
        ? `No se pudo descargar el archivo. ${error.message}`
        : "No se pudo descargar el archivo.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog
      title={name}
      description={type || "Archivo adjunto"}
      onClose={onClose}
      width="max-w-5xl"
    >
      <div className="grid min-h-64 max-h-[72dvh] place-items-center overflow-auto bg-slate-950 p-3 sm:p-6">
        {type.startsWith("image/") ? (
          <img src={url} alt={name} className="max-h-[66dvh] max-w-full rounded-lg object-contain" />
        ) : type === "application/pdf" || type.startsWith("text/") ? (
          <iframe title={`Vista previa de ${name}`} src={url} className="h-[65dvh] w-full rounded-lg bg-white" />
        ) : type.startsWith("video/") ? (
          <video src={url} controls className="max-h-[66dvh] max-w-full rounded-lg" />
        ) : type.startsWith("audio/") ? (
          <audio src={url} controls className="w-full max-w-xl" />
        ) : (
          <div className="max-w-md rounded-2xl bg-white p-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon name="file" className="size-8" />
            </span>
            <p className="mt-4 break-all font-semibold text-slate-900">{name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Este formato no se puede previsualizar en el navegador. Descárgalo para abrirlo en Word, Excel u otra aplicación compatible.
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {downloadError
          ? <p role="alert" className="text-sm text-rose-700">{downloadError}</p>
          : <span className="text-xs text-slate-500">{type || "Tipo de archivo no especificado"}</span>}
        <div className="flex justify-end gap-2">
          <Button tone="quiet" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => void download()} disabled={downloading}>
            <Icon name="download" className="size-4" />
            {downloading ? "Descargando…" : "Descargar"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
