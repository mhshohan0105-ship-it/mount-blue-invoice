// Turns the on-screen A4 sheets into a PDF entirely in the browser.
// Each sheet is rendered to an image first, so Bangla text and the logo look
// exactly as they do on screen (PDF text fonts can't shape Bangla properly).

const A4_W_MM = 210;
const A4_H_MM = 297;

export async function downloadSheetsAsPdf(container: HTMLElement, filename: string): Promise<void> {
  const sheets = Array.from(container.querySelectorAll<HTMLElement>(".sheet"));
  if (!sheets.length) throw new Error("Nothing to export");

  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  await document.fonts.ready;

  container.classList.add("capturing");
  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const image = await toJpeg(sheet, {
        quality: 0.95,
        pixelRatio: 2.5, // ~240 dpi: sharp text, reasonable file size
        backgroundColor: "#ffffff",
        width: sheet.offsetWidth,
        height: sheet.offsetHeight,
        style: { margin: "0" },
      });
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(image, "JPEG", 0, 0, A4_W_MM, A4_H_MM, undefined, "FAST");
    }
    pdf.save(filename);
  } finally {
    container.classList.remove("capturing");
  }
}
