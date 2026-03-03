import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function exportUrbanChangePdf(
  elementId: string,
  locationName: string,
): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Dashboard element not found')

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#09090b',
    useCORS: true,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  })

  const pdf = new jsPDF('landscape', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10

  // Header
  pdf.setFontSize(14)
  pdf.setTextColor(255, 255, 255)
  pdf.setFillColor(9, 9, 11)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  pdf.text(`Urban Change Report — ${locationName}`, margin, margin + 6)

  pdf.setFontSize(8)
  pdf.setTextColor(160, 160, 170)
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  pdf.text(`Exported ${exportDate}`, margin, margin + 12)

  const contentTop = margin + 18
  const imgData = canvas.toDataURL('image/png')
  const contentWidth = pageWidth - margin * 2
  const imgAspect = canvas.height / canvas.width
  const imgHeight = contentWidth * imgAspect
  const availableHeight = pageHeight - contentTop - margin

  if (imgHeight <= availableHeight) {
    pdf.addImage(imgData, 'PNG', margin, contentTop, contentWidth, imgHeight)
  } else {
    // Paginate: slice canvas into page-sized chunks
    const scaleFactor = canvas.width / contentWidth
    const sliceHeightPx = availableHeight * scaleFactor
    let srcY = 0
    let isFirstPage = true

    while (srcY < canvas.height) {
      if (!isFirstPage) {
        pdf.addPage()
        pdf.setFillColor(9, 9, 11)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      }

      const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - srcY)
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = currentSliceHeight
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(
        canvas,
        0, srcY, canvas.width, currentSliceHeight,
        0, 0, canvas.width, currentSliceHeight,
      )

      const sliceData = sliceCanvas.toDataURL('image/png')
      const sliceDrawHeight = currentSliceHeight / scaleFactor
      const yPos = isFirstPage ? contentTop : margin
      pdf.addImage(sliceData, 'PNG', margin, yPos, contentWidth, sliceDrawHeight)

      srcY += currentSliceHeight
      isFirstPage = false
    }
  }

  const safeName = locationName.replace(/[^a-zA-Z0-9]/g, '_')
  pdf.save(`urban-change-${safeName}.pdf`)
}
