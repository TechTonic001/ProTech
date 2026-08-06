import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const downloadElementAsPdf = async (elementId, receiptData) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Receipt content not found');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pageWidth - margin * 2;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  const maxHeight = pageHeight - margin * 2;
  const renderHeight = pdfHeight > maxHeight ? maxHeight : pdfHeight;
  const renderWidth = pdfWidth * (renderHeight / pdfHeight);

  pdf.addImage(imgData, 'PNG', margin, margin, renderWidth, renderHeight);

  const reference = receiptData?.paystack_ref || receiptData?.receipt_number || new Date().toISOString().slice(0, 10);
  const fileName = `Rent_Receipt_${reference}.pdf`;
  pdf.save(fileName);
};
